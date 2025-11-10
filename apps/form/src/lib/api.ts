// apps/form/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Función auxiliar para subir archivos
const uploadFileToS3 = async (uploadURL: string, file: File): Promise<void> => {
  console.log('📤 Subiendo archivo a S3:', file.name);
  const response = await fetch(uploadURL, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error('Error al subir archivo a S3');
  }
  console.log('✅ Archivo subido a S3:', file.name);
};

export const apiClient = {
  async submitForm(formData: any) {
    console.log('🚀 Iniciando envío de formulario...');
    
    // Primero crear el cliente sin archivos
    const clientData = {
      personalData: {
        ...formData.personalData,
        profilePhoto: undefined // Excluir el archivo del JSON
      },
      medicalData: {
        ...formData.medicalData,
        documents: undefined // Excluir documentos del JSON
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
    const clientId = result.data._id;

    console.log('✅ Cliente creado, ID:', clientId);

    // Subir archivos si existen
    try {
      // Subir foto de perfil
      if (formData.personalData.profilePhoto) {
        console.log('📸 Subiendo foto de perfil...');
        await this.uploadProfilePhoto(clientId, formData.personalData.profilePhoto);
      } else {
        console.log('⚠️ No hay foto de perfil para subir');
      }

      // Subir documentos médicos
      if (formData.medicalData.documents && formData.medicalData.documents.length > 0) {
        console.log('📄 Subiendo documentos médicos...', formData.medicalData.documents.length);
        await this.uploadDocuments(clientId, formData.medicalData.documents);
      } else {
        console.log('⚠️ No hay documentos para subir');
      }

      console.log('✅ Todos los archivos subidos exitosamente');
    } catch (uploadError) {
      console.error('❌ Error subiendo archivos:', uploadError);
      // NO relanzamos el error para que el formulario se complete aunque falle S3
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