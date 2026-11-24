import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getRecipesCollection, connectMongoose } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { encrypt, decrypt, encryptFileObject, decryptFileObject, safeDecrypt, isEncrypted } from '@/app/lib/encryption';
import { S3Service } from '@/app/lib/s3';
import { requireCoachAuth, requireAnyAuth } from '@/app/lib/auth';
import EditProposal from '@/app/models/EditProposal';
import ClientAccount from '@/app/models/ClientAccount';
import { resolveEffectiveClientEntitlements } from '@/app/lib/plans';
import { apiHandler } from '@/app/lib/apiHandler';
import { logAuditEvent } from '@/app/lib/auditLogger';

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Obtener receta por ID', async () => {
    try {
      const auth = requireAnyAuth(request);
      const { id } = await params;

      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'ID de receta inválido', code: 'VALIDATION' },
          { status: 400 }
        );
      }

      const recipesCollection = await getRecipesCollection();

      if (auth.role === 'client') {
        await connectMongoose();
        const account = await ClientAccount.findById(auth.clientAccountId)
          .select('purchasedPlans activePlanId')
          .lean() as { purchasedPlans?: Array<{ planId?: unknown; status?: unknown }>; activePlanId?: string | null } | null;

        if (!account) {
          return NextResponse.json(
            { success: false, message: 'Cuenta de cliente no encontrada', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        const entitlements = resolveEffectiveClientEntitlements(
          account.purchasedPlans,
          account.activePlanId || null
        );

        if (entitlements.libraryAccess === 'none') {
          return NextResponse.json(
            {
              success: false,
              message: 'Tu plan actual no incluye acceso a la biblioteca de recetas.',
              code: 'FORBIDDEN',
            },
            { status: 403 }
          );
        }

        if (entitlements.libraryAccess === 'limited' && entitlements.recipesLimit !== null) {
          const allowedDocs = await recipesCollection
            .find({ isPublished: true }, { projection: { _id: 1 } })
            .sort({ createdAt: 1, _id: 1 })
            .limit(entitlements.recipesLimit)
            .toArray();
          const isAllowed = allowedDocs.some((doc) => doc._id.toString() === id);
          if (!isAllowed) {
            return NextResponse.json(
              {
                success: false,
                message: 'Esta receta requiere Plan 3 para acceso completo a la biblioteca.',
                code: 'FORBIDDEN',
              },
              { status: 403 }
            );
          }
        }
      }

      logger.info('RECIPES', 'Solicitud GET /api/recipes/[id] recibida', { id });

      const queryFilter: Record<string, unknown> = { _id: new ObjectId(id) };
      if (auth.role !== 'admin') {
        queryFilter.isPublished = true;
      }

      const recipe = await recipesCollection.findOne(queryFilter);

      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const decryptedRecipe: Record<string, unknown> = {
        ...recipe,
        id: recipe._id.toString(),
        title: safeDecrypt(recipe.title),
        description: safeDecrypt(recipe.description),
        category: Array.isArray(recipe.category)
          ? recipe.category.map((cat: string) => safeDecrypt(cat))
          : [],
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(recipe.instructions)
          ? recipe.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: recipe.nutrition,
        cookTime: recipe.cookTime,
        difficulty: safeDecrypt(recipe.difficulty),
        author: recipe.author ? safeDecrypt(recipe.author) : 'NelHealthCoach',
        isPublished: recipe.isPublished,
        tags: Array.isArray(recipe.tags)
          ? recipe.tags.map((tag: string) => safeDecrypt(tag))
          : [],
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      };

      if (recipe.image) {
        decryptedRecipe.image = decryptFileObject(recipe.image);
      } else {
        decryptedRecipe.image = null;
      }

      const res = NextResponse.json({
        success: true,
        data: decryptedRecipe,
      });
      res.headers.set('Cache-Control', 'private, no-store');
      return res;

    } catch (error: unknown) {
      const structured = error as { status?: number; message?: string };
      if (structured?.status === 401 || structured?.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: structured.message || 'No autorizado',
            code: structured.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          },
          { status: structured.status }
        );
      }
      logger.error('RECIPES', 'Error obteniendo receta', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error obteniendo receta',
          ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
          code: 'INTERNAL',
        },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]' });
}

export const GET = apiHandler(getHandler);

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Actualizar receta', async () => {
    try {
      // OWASP A01: verificar autenticación ANTES de parsear body o modificar S3
      const auth = requireCoachAuth(request);

      const { id } = await params;
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'ID de receta inválido', code: 'VALIDATION' },
          { status: 400 }
        );
      }

      const recipesCollection = await getRecipesCollection();
      const data = await request.json();

      logger.info('RECIPES', 'Solicitud PUT /api/recipes/[id] recibida', { id });

      const reqCtx = {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      };

      const currentRecipe = await recipesCollection.findOne({ _id: new ObjectId(id) });

      if (!currentRecipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Manejar imagen (solo admin elimina S3 directo; coach propone cambio)
      if (data.image !== undefined) {
        if (data.image && typeof data.image === 'object' && data.image.key) {
          if (auth.role === 'admin' && currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              if (typeof oldFileKey === 'string' && isEncrypted(oldFileKey)) {
                try {
                  oldFileKey = decrypt(oldFileKey);
                } catch (decryptError) {
                  logger.error('RECIPES', 'Error desencriptando oldFileKey', decryptError, { recipeId: id });
                }
              }

              const newFileKey = data.image.key;
              if (oldFileKey && oldFileKey !== newFileKey) {
                try {
                  await S3Service.deleteFile(oldFileKey);
                  logger.info('RECIPES', '✅ Imagen anterior eliminada de S3', { recipeId: id });
                } catch (s3Error) {
                  logger.error('RECIPES', '⚠️ Error eliminando imagen anterior de S3', s3Error as Error, {
                    recipeId: id,
                  });
                }
              }
            } catch (error) {
              logger.error('RECIPES', '❌ Error en proceso de eliminación de imagen anterior', error as Error, {
                recipeId: id,
              });
            }
          }

          data.image = encryptFileObject(data.image);
        } else if (data.image === null || data.image === '' || !data.image.key) {
          if (auth.role === 'admin' && currentRecipe.image && currentRecipe.image.key) {
            try {
              let oldFileKey = currentRecipe.image.key;
              if (typeof oldFileKey === 'string' && isEncrypted(oldFileKey)) {
                try {
                  oldFileKey = decrypt(oldFileKey);
                } catch (decryptError) {
                  logger.error('RECIPES', 'Error desencriptando oldFileKey para eliminación', decryptError, { recipeId: id });
                }
              }

              if (oldFileKey && oldFileKey.trim() !== '') {
                await S3Service.deleteFile(oldFileKey);
                logger.info('RECIPES', '🗑️ Imagen eliminada de S3 (se quitó en edición)', { recipeId: id });
              }
            } catch (s3Error) {
              logger.error('RECIPES', '⚠️ Error eliminando imagen de S3', s3Error as Error, { recipeId: id });
            }
          }

          data.image = {
            url: '',
            key: '',
            name: '',
            type: '',
            size: 0,
            uploadedAt: '',
          };
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      const fieldsToEncrypt = [
        'title',
        'description',
        'category',
        'ingredients',
        'instructions',
        'difficulty',
        'author',
        'tags',
      ];

      fieldsToEncrypt.forEach(field => {
        if (data[field] !== undefined) {
          if (Array.isArray(data[field])) {
            updateData[field] = data[field].map((item: string) => encrypt(item));
          } else if (typeof data[field] === 'string') {
            updateData[field] = encrypt(data[field]);
          }
        }
      });

      if (data.nutrition !== undefined) updateData.nutrition = data.nutrition;
      if (data.cookTime !== undefined) updateData.cookTime = data.cookTime;
      if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
      if (data.image !== undefined) updateData.image = data.image;

      if (auth.role !== 'admin') {
        await connectMongoose();
        const proposal = await EditProposal.create({
          targetType: 'recipe',
          targetId: new ObjectId(id),
          proposedChanges: updateData,
          proposedBy: new ObjectId(auth.coachId),
          proposedByName: auth.email,
          status: 'pending',
        });

        logger.info('RECIPES', 'Propuesta de edición creada', {
          recipeId: id,
          proposalId: proposal._id.toString(),
          coachId: auth.coachId,
        });

        return NextResponse.json({
          success: true,
          message: 'Tu propuesta de edición ha sido enviada para revisión del administrador',
          data: {
            pendingApproval: true,
            proposalId: proposal._id.toString(),
          },
        });
      }

      const result = await recipesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const decryptedRecipe: Record<string, unknown> = {
        ...result,
        id: result._id.toString(),
        title: safeDecrypt(result.title),
        description: safeDecrypt(result.description),
        category: Array.isArray(result.category)
          ? result.category.map((cat: string) => safeDecrypt(cat))
          : [],
        ingredients: Array.isArray(result.ingredients)
          ? result.ingredients.map((ing: string) => safeDecrypt(ing))
          : [],
        instructions: Array.isArray(result.instructions)
          ? result.instructions.map((inst: string) => safeDecrypt(inst))
          : [],
        nutrition: result.nutrition,
        cookTime: result.cookTime,
        difficulty: safeDecrypt(result.difficulty),
        author: result.author ? safeDecrypt(result.author) : 'NelHealthCoach',
        isPublished: result.isPublished,
        tags: Array.isArray(result.tags)
          ? result.tags.map((tag: string) => safeDecrypt(tag))
          : [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      if (result.image) {
        decryptedRecipe.image = decryptFileObject(result.image);
      } else {
        decryptedRecipe.image = null;
      }

      logAuditEvent({
        eventType: 'RECIPE_UPDATED',
        severity: 'info',
        message: `Receta actualizada: ${id}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: `/api/recipes/${id}`,
        method: 'PUT',
        statusCode: 200,
      });

      return NextResponse.json({
        success: true,
        message: 'Receta actualizada exitosamente',
        data: decryptedRecipe,
      });

    } catch (error: unknown) {
      const structured = error as { status?: number; message?: string };
      if (structured?.status === 401 || structured?.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: structured.message || 'No autorizado',
            code: structured.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          },
          { status: structured.status }
        );
      }
      logger.error('RECIPES', 'Error actualizando receta', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error actualizando receta',
          ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
          code: 'INTERNAL',
        },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]', method: 'PUT' });
}

export const PUT = apiHandler(putHandler);

async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('RECIPES', 'Eliminar receta', async () => {
    try {
      const auth = requireCoachAuth(request);

      if (auth.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Solo administradores pueden eliminar recetas', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      const { id } = await params;
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'ID de receta inválido', code: 'VALIDATION' },
          { status: 400 }
        );
      }

      const recipesCollection = await getRecipesCollection();

      const reqCtx = {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      };

      logger.info('RECIPES', 'Solicitud DELETE /api/recipes/[id] recibida', { id });

      const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });

      if (!recipe) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if (recipe.image && recipe.image.key) {
        try {
          let fileKey = recipe.image.key;

          if (typeof fileKey === 'string' && isEncrypted(fileKey)) {
            fileKey = decrypt(fileKey);
          }

          if (fileKey && fileKey.trim() !== '') {
            await S3Service.deleteFile(fileKey);
            logger.info('RECIPES', 'Imagen eliminada de S3 en DELETE', {
              recipeId: id,
            });
          }
        } catch (s3Error) {
          logger.error('RECIPES', 'Error eliminando imagen de S3 en DELETE', s3Error as Error, {
            recipeId: id,
          });
        }
      }

      const result = await recipesCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'Receta no encontrada', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      logAuditEvent({
        eventType: 'RECIPE_DELETED',
        severity: 'warning',
        message: `Receta eliminada: ${id}`,
        coachId: auth.coachId,
        ...reqCtx,
        path: `/api/recipes/${id}`,
        method: 'DELETE',
        statusCode: 200,
      });

      return NextResponse.json({
        success: true,
        message: 'Receta eliminada exitosamente',
      });

    } catch (error: unknown) {
      const structured = error as { status?: number; message?: string };
      if (structured?.status === 401 || structured?.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: structured.message || 'No autorizado',
            code: structured.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          },
          { status: structured.status }
        );
      }
      logger.error('RECIPES', 'Error eliminando receta', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error eliminando receta',
          ...(process.env.NODE_ENV === 'development' && error instanceof Error && { detail: error.message }),
          code: 'INTERNAL',
        },
        { status: 500 }
      );
    }
  }, { endpoint: '/api/recipes/[id]', method: 'DELETE' });
}

export const DELETE = apiHandler(deleteHandler);
