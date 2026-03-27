// apps/form/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Minimal types for the form payload used by submitForm
type PersonalData = {
  profilePhoto?: File | null;
  [key: string]: unknown;
};

type MedicalData = {
  documents?: File[];
  [key: string]: unknown;
};

export type FormPayload = {
  personalData: PersonalData;
  medicalData: MedicalData;
  contractAccepted?: boolean;
  [key: string]: unknown;
};

// Función auxiliar para subir archivos
const uploadFileToS3 = async (uploadURL: string, file: File): Promise<void> => {
  console.log('📤 Subiendo archivo a S3:', file.name);
  console.log('🔗 URL de S3:', uploadURL);
  
  try {
    const response = await fetch(uploadURL, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    console.log('📊 Respuesta de S3:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const text = await response.text().catch(() => '<no body>');
      console.error('❌ Error subiendo a S3:', text);
      throw new Error(`Error subiendo a S3: ${response.status}`);
    }

    console.log('✅ Archivo subido a S3 correctamente:', file.name);
  } catch (err) {
    console.error('❌ Excepción subiendo a S3:', err);
    throw err;
  }
};

export const apiClient = {
  async submitForm(formData: FormPayload) {
    console.log('🚀 Iniciando envío de formulario...');
    console.log('📊 Datos recibidos en submitForm:', {
      hasMedicalData: !!formData.medicalData,
      hasDocuments: !!formData.medicalData?.documents,
      documentCount: formData.medicalData?.documents?.length || 0,
      documentTypes: formData.medicalData?.documents?.map(d => typeof d) || []
    });
    
    // Primero crear el cliente sin archivos
    const clientData = {
      personalData: {
        ...formData.personalData,
        profilePhoto: undefined
      },
      medicalData: {
        ...formData.medicalData,
        documents: undefined
      },
      contractAccepted: formData.contractAccepted
    };

    console.log('📤 Enviando datos del cliente a la API...');

    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al enviar el formulario');
    }

    const result = await response.json();
    console.log('✅ Respuesta completa del servidor:', JSON.stringify(result, null, 2));

    // VERIFICACIÓN MEJORADA - Buscar _id específicamente
    if (!result.success) {
      console.error('❌ La respuesta del servidor no fue exitosa:', result);
      throw new Error(result.message || 'Error del servidor');
    }

    let clientId: string | undefined;
    
    // ✅ BUSCAR _id PRIMERO (que es lo que debería devolver el backend corregido)
    if (result.data && result.data._id) {
      clientId = result.data._id;
      console.log('✅ ClientId obtenido de result.data._id:', clientId);
    } 
    // ✅ También buscar 'id' por si acaso (backwards compatibility)
    else if (result.data && result.data.id) {
      clientId = result.data.id;
      console.log('✅ ClientId obtenido de result.data.id:', clientId);
    }
    // ✅ Buscar en otros lugares por si hay inconsistencias
    else if (result._id) {
      clientId = result._id;
      console.log('✅ ClientId obtenido de result._id:', clientId);
    }
    else if (result.id) {
      clientId = result.id;
      console.log('✅ ClientId obtenido de result.id:', clientId);
    }
    else {
      console.error('❌ NO SE PUDO OBTENER EL CLIENT_ID. Respuesta completa:', result);
      // Continuamos sin clientId - el formulario se envió pero sin archivos
      console.log('⚠️ Continuando sin subir archivos debido a clientId faltante');
      return result;
    }

    console.log('✅ Cliente creado, ID:', clientId);

    // Subir archivos si existen
    try {
      // Subir foto de perfil
      if (formData.personalData.profilePhoto) {
        console.log('📸 Subiendo foto de perfil...');
        await this.uploadProfilePhoto(clientId as string, formData.personalData.profilePhoto as File);
      } else {
        console.log('⚠️ No hay foto de perfil para subir');
      }

      // Subir documentos médicos
      if (formData.medicalData.documents && formData.medicalData.documents.length > 0) {
        console.log('📄 Subiendo documentos médicos...', formData.medicalData.documents.length);
        await this.uploadDocuments(clientId as string, formData.medicalData.documents as File[]);
      } else {
        console.log('⚠️ No hay documentos para subir - continuando sin documentos');
        // No hay error, simplemente continuamos
      }

      console.log('✅ Proceso de archivos completado');
    } catch (uploadError) {
      console.error('❌ Error en proceso de archivos:', uploadError);
      // No relanzamos el error - el formulario principal ya se envió
    }

    return result;
  },

  async uploadProfilePhoto(clientId: string, file: File) {
    try {
      console.log('🔑 Obteniendo URL firmada para foto de perfil...', { clientId, fileName: file.name });
      
      // 1. Obtener URL firmada
      const uploadResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileCategory: 'profile'
        }),
      });

      console.log('📡 Respuesta de URL firmada:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Error obteniendo URL de upload:', errorText);
        throw new Error('Error al obtener URL de upload: ' + uploadResponse.status);
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ URL firmada obtenida:', uploadData);

      // 2. Subir archivo a S3
      console.log('☁️ Subiendo a S3...');
      await uploadFileToS3(uploadData.data.uploadURL, file);

      // 3. Confirmar upload
      console.log('✅ Confirmando upload en base de datos...');
      const confirmResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileKey: uploadData.data.fileKey,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileCategory: 'profile',
          fileURL: uploadData.data.fileURL
        }),
      });

      if (!confirmResponse.ok) {
        const errorText = await confirmResponse.text();
        console.error('❌ Error confirmando upload:', errorText);
        throw new Error('Error al confirmar upload: ' + confirmResponse.status);
      }

      console.log('✅ Foto de perfil subida y confirmada exitosamente');
    } catch (error) {
      console.error('❌ Error subiendo foto de perfil:', error);
      throw error;
    }
  },

  async uploadDocuments(clientId: string, files: File[]) {
    for (const file of files) {
      try {
        console.log('🔑 Obteniendo URL firmada para documento:', file.name);
        
        // 1. Obtener URL firmada
        const uploadResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileCategory: 'document'
          }),
        });

        console.log('📡 Respuesta de URL firmada para documento:', uploadResponse.status);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('❌ Error obteniendo URL de upload para documento:', errorText);
          continue; // Continuar con el siguiente archivo
        }

        const uploadData = await uploadResponse.json();
        console.log('✅ URL firmada obtenida para documento:', uploadData);

        // 2. Subir archivo a S3
        console.log('☁️ Subiendo documento a S3...', file.name);
        await uploadFileToS3(uploadData.data.uploadURL, file);

        // 3. Confirmar upload
        console.log('✅ Confirmando upload de documento en base de datos...');
        const confirmResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileKey: uploadData.data.fileKey,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileCategory: 'document',
            fileURL: uploadData.data.fileURL
          }),
        });

        if (!confirmResponse.ok) {
          const errorText = await confirmResponse.text();
          console.error('❌ Error confirmando upload de documento:', errorText);
        } else {
          console.log('✅ Documento subido y confirmado:', file.name);
        }

      } catch (error) {
        console.error('❌ Error subiendo documento:', file.name, error);
        // Continuamos con el siguiente archivo
      }
    }
  },
};