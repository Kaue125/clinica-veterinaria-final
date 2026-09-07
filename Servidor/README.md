# 🐾 VetCare — Servidor WhatsApp Automático

Envia mensagens de confirmação automáticas para o **cliente** e para a **clínica** sempre que um agendamento for feito pelo site.

---

## 📁 Estrutura da pasta `servidor/`

```
servidor/
├── server.js          ← código do servidor
├── package.json       ← dependências Node.js
├── docker-compose.yml ← configuração da Evolution API
├── INICIAR.bat        ← ▶️ clique aqui para iniciar tudo
├── PARAR.bat          ← ⏹️ clique aqui para parar
└── README.md          ← este arquivo
```

---

## 🚀 Como usar (primeira vez)

### Pré-requisitos
- ✅ Node.js instalado (você já tem)
- ✅ Docker Desktop instalado ([baixar aqui](https://www.docker.com/products/docker-desktop))

### Passo a passo

**1.** Instale o Docker Desktop e reinicie o computador

**2.** Abra a pasta `servidor/` no Windows Explorer

**3.** Dê **duplo clique** no arquivo `INICIAR.bat`
   > O script vai instalar tudo automaticamente e abrir o navegador

**4.** Na página que abrir (`http://localhost:3001/setup`):
   - Clique em **"Gerar QR Code"**
   - Abra o WhatsApp no celular
   - Vá em **Configurações → Dispositivos vinculados → Vincular dispositivo**
   - Escaneie o QR Code com a câmera

**5.** Aguarde o status mudar para ✅ **Conectado**

**6.** Pronto! A partir de agora todo agendamento no site envia mensagens automáticas.

## 🌍 Publicar para acessar de qualquer lugar

O arquivo `render.yaml`, na raiz do projeto, configura a publicação do site e do painel
na Render. A Render fornece HTTPS automaticamente, então o celular poderá acessar por
um endereço público como `https://vetcare.onrender.com`.

1. Crie uma conta em [render.com](https://render.com).
2. Escolha **New + → Blueprint** e selecione este repositório.
3. Confirme o serviço definido em `render.yaml`.
4. Em **Environment**, configure `EVOLUTION_URL`, `EVOLUTION_API_KEY`,
   `EVOLUTION_INSTANCE` e `CLINICA_NUM`.
5. Após o deploy, abra `https://SEU-ENDERECO.onrender.com/` no celular.

A Evolution API não pode continuar em `localhost` na Render: ela também precisa estar
publicada em um servidor acessível pela internet. Sem isso, o site funcionará, mas os
envios de WhatsApp não funcionarão.

O armazenamento atual usa arquivo local. Para não perder mensagens e agendamentos
quando o serviço for reiniciado, use um banco de dados ou um disco persistente da
Render (recurso pago).

---

## ⚙️ Configurações

Abra o `server.js` e edite o bloco `CONFIG`:

```js
const CONFIG = {
  porta:        3001,
  instanceName: 'vetcare',
  apiUrl:       'http://localhost:8080',
  apiKey:       'vetcare-secret-key',
  clinicaNum:   '5511987654321',  // ⚠️ TROQUE pelo número real da clínica
};
```

---

## 📱 Mensagens enviadas

### Para o **cliente**:
```
Olá, *João*! 🐾

Seu agendamento na *VetCare* foi confirmado!

📅 Data: sexta-feira, 21 de março de 2026
⏰ Horário: 14:00
💉 Serviço: Consulta Clínica
🐾 Pet: Rex

📍 Endereço: Rua das Flores, 123 – Vila Madalena, SP
📞 Telefone: (11) 9 8765-4321

Até breve! 😊
```

### Para a **clínica**:
```
🔔 Novo Agendamento – VetCare

👤 Cliente: João Silva
📱 WhatsApp: (11) 9 9999-9999
📧 E-mail: joao@email.com
🐾 Pet: Rex
💉 Serviço: Consulta Clínica
📅 Data: sexta-feira, 21 de março de 2026
⏰ Horário: 14:00

Agendamento realizado pelo site. Status: Pendente.
```

---

## 🔄 Uso diário

- **Iniciar:** duplo clique em `INICIAR.bat`
- **Parar:** feche a janela do terminal OU clique em `PARAR.bat`
- **O QR Code expira** — se o WhatsApp desconectar, clique em "Gerar QR Code" novamente em `http://localhost:3001/setup`

---

## ❓ Problemas comuns

| Problema | Solução |
|----------|---------|
| "Docker não encontrado" | Instale o Docker Desktop e reinicie |
| QR Code não aparece | Aguarde 30s e tente novamente |
| Mensagens não chegam | Verifique se o WhatsApp está conectado em `/setup` |
| Número banido | Use um número diferente ou aguarde 24h |

---

## ⚠️ Importante

- O número de WhatsApp conectado será o **remetente** das mensagens
- Use de preferência o **WhatsApp Business** da clínica
- Evite enviar muitas mensagens em curto tempo para não arriscar bloqueio
- O servidor precisa estar **ligado e rodando** para enviar mensagens automáticas
- Quando o site for hospedado online, o servidor também precisará estar online (ex: VPS, Railway, Render)
