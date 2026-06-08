export const integrations = {
  cep: {
    name: "ViaCEP",
    status: "enabled",
    url: "https://viacep.com.br/ws/{cep}/json/"
  },
  auth: {
    name: "Firebase Authentication",
    status: "requires_env"
  },
  upload: {
    name: "Supabase Storage",
    status: "requires_env"
  },
  push: {
    name: "Firebase Cloud Messaging",
    status: "requires_env"
  },
  maps: {
    name: "OpenStreetMap",
    status: "enabled"
  },
  payments: {
    name: process.env.PAYMENT_PROVIDER || "Provider pendente",
    status: process.env.PAYMENT_ACCESS_TOKEN ? "enabled" : "requires_provider"
  }
} as const;
