require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Nel Health Coach funcionando');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en puerto ${PORT}`);
});