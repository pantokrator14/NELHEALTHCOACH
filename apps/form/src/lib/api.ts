// apps/form/src/lib/api.ts
import { getVisitorId } from './fingerprint';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CONTRACT_VERSION = '2026.1';

// Headers base para peticiones JSON a la API
function getBaseHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const visitorId = getVisitorId();
  if (visitorId) {
    headers['X-Visitor-Id'] = visitorId;
  }
  return headers;
}

// Tipos base para el payload
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
  contractVersion?: string;
  stripeSessionId?: string;
  free?: boolean;
  healthDataConsent?: boolean;
  termsAndPrivacyConsent?: boolean;
  immediateServiceConsent?: boolean;
  marketingConsent?: boolean;
  consentTimestamp?: string;
  consentPolicyVersion?: string;
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
  async submitForm(formData: FormPayload, coachId?: string) {
    console.log('🚀 Iniciando envío de formulario...');
    console.log('📊 Datos recibidos en submitForm:', {
      hasMedicalData: !!formData.medicalData,
      hasDocuments: !!formData.medicalData?.documents,
      documentCount: formData.medicalData?.documents?.length || 0,
      documentTypes: formData.medicalData?.documents?.map(d => typeof d) || [],
      coachId: coachId || 'no coach',
    });
    
    // Primero crear el cliente sin archivos
    const clientData: Record<string, unknown> = {
      personalData: {
        ...formData.personalData,
        profilePhoto: undefined
      },
      medicalData: {
        ...formData.medicalData,
        documents: undefined
      },
      contractAccepted: formData.contractAccepted,
      contractVersion: formData.contractVersion,
      // Consentimientos RGPD Art. 9 y Legal Compliance
      healthDataConsent: formData.healthDataConsent,
      termsAndPrivacyConsent: formData.termsAndPrivacyConsent,
      immediateServiceConsent: formData.immediateServiceConsent,
      marketingConsent: formData.marketingConsent,
      consentTimestamp: formData.consentTimestamp,
      consentPolicyVersion: formData.consentPolicyVersion,
      // Reenviar campos de pago/link gratuito (JSON.stringify omite undefined)
      stripeSessionId: formData.stripeSessionId,
      free: formData.free,
    };

    // Incluir coachId si existe
    if (coachId) {
      clientData.coachId = coachId;
    }

    console.log('📤 Enviando datos del cliente a la API...');

    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: getBaseHeaders(),
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
    // ✅ Si result.data es el ID directamente (string)
    else if (typeof result.data === 'string') {
      clientId = result.data;
      console.log('✅ ClientId obtenido de result.data (string):', clientId);
    }

    if (!clientId) {
      console.error('❌ No se encontró ningún ID en la respuesta:', result);
      throw new Error('No se recibió el ID del cliente en la respuesta del servidor');
    }

    console.log('🎯 ClientId final que se usará para uploads:', clientId);

    // Subir foto de perfil si existe
    if (formData.personalData.profilePhoto instanceof File) {
      console.log('📸 Subiendo foto de perfil...', formData.personalData.profilePhoto.name);
      
      const photoPayload = {
        files: [{
          fieldName: 'profilePhoto',
          fileName: formData.personalData.profilePhoto.name,
          contentType: formData.personalData.profilePhoto.type
        }]
      };

      console.log('📤 Solicitando URL prefirmada para foto:', photoPayload);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify(photoPayload),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '<no body>');
        console.error('❌ Error obteniendo URL prefirmada para foto:', uploadResponse.status, errorText);
        throw new Error(`Error al obtener URL prefirmada para foto de perfil: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('📥 Respuesta de URL prefirmada para foto:', uploadData);

      if (!uploadData.success || !uploadData.data || !uploadData.data[0]) {
        throw new Error('Respuesta inválida al solicitar URL prefirmada para foto');
      }

      await uploadFileToS3(uploadData.data[0].uploadUrl, formData.personalData.profilePhoto);

      const confirmPayload = {
        fieldName: 'profilePhoto',
        key: uploadData.data[0].key,
        originalName: uploadData.data[0].originalName
      };

      console.log('📤 Confirmando subida de foto en la base de datos:', confirmPayload);

      const confirmResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
        method: 'PUT',
        headers: getBaseHeaders(),
        body: JSON.stringify(confirmPayload),
      });

      if (!confirmResponse.ok) {
        const errorText = await confirmResponse.text().catch(() => '<no body>');
        console.error('❌ Error confirmando foto:', confirmResponse.status, errorText);
        throw new Error(`Error al confirmar subida de foto de perfil: ${confirmResponse.status}`);
      }

      console.log('✅ Foto de perfil subida y confirmada exitosamente');
    }

    // Subir documentos médicos si existen
    if (formData.medicalData.documents && formData.medicalData.documents.length > 0) {
      console.log(`📑 Subiendo ${formData.medicalData.documents.length} documentos médicos...`);
      
      for (const doc of formData.medicalData.documents) {
        if (doc instanceof File) {
          console.log(`📄 Procesando documento: ${doc.name} (${doc.type}, ${doc.size} bytes)`);
          
          const docPayload = {
            files: [{
              fieldName: 'documents',
              fileName: doc.name,
              contentType: doc.type
            }]
          };

          console.log('📤 Solicitando URL prefirmada para documento:', docPayload);

          const uploadResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
            method: 'POST',
            headers: getBaseHeaders(),
            body: JSON.stringify(docPayload),
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => '<no body>');
            console.error('❌ Error obteniendo URL prefirmada para documento:', uploadResponse.status, errorText);
            throw new Error(`Error al obtener URL prefirmada para documento ${doc.name}: ${uploadResponse.status}`);
          }

          const uploadData = await uploadResponse.json();
          console.log('📥 Respuesta de URL prefirmada para documento:', uploadData);

          if (!uploadData.success || !uploadData.data || !uploadData.data[0]) {
            throw new Error(`Respuesta inválida al solicitar URL prefirmada para ${doc.name}`);
          }

          await uploadFileToS3(uploadData.data[0].uploadUrl, doc);

          const confirmPayload = {
            fieldName: 'documents',
            key: uploadData.data[0].key,
            originalName: uploadData.data[0].originalName
          };

          console.log('📤 Confirmando subida de documento en la base de datos:', confirmPayload);

          const confirmResponse = await fetch(`${API_BASE_URL}/api/clients/${clientId}/upload`, {
            method: 'PUT',
            headers: getBaseHeaders(),
            body: JSON.stringify(confirmPayload),
          });

          if (!confirmResponse.ok) {
            const errorText = await confirmResponse.text().catch(() => '<no body>');
            console.error('❌ Error confirmando documento:', confirmResponse.status, errorText);
            throw new Error(`Error al confirmar subida de documento ${doc.name}: ${confirmResponse.status}`);
          }

          console.log(`✅ Documento ${doc.name} subido y confirmado exitosamente`);
        }
      }
    }

    console.log('🎉 Formulario completado exitosamente con todos sus archivos');
    return result;
  }
};

export { API_BASE_URL, CONTRACT_VERSION };
