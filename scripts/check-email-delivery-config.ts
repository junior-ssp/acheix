const requiredVariables = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;
const isProductionDeployment = process.env.VERCEL_ENV === "production";
const missing = requiredVariables.filter((name) => !process.env[name]?.trim());

if (isProductionDeployment && missing.length) {
  console.error(
    `Deploy bloqueado: configure as variáveis obrigatórias do serviço de e-mail: ${missing.join(", ")}.`
  );
  process.exit(1);
}

console.log(
  missing.length
    ? `Configuração de e-mail não exigida neste ambiente (${missing.join(", ")} ausentes).`
    : "Configuração obrigatória do serviço de e-mail presente."
);
