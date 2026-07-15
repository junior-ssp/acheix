# Achei X Master Rules

These rules are mandatory for every change in this repository.

1. Never expand scope without explicit authorization.
   - If the AI is about to do anything that was not clearly requested, or that could affect another feature, project area, database record, production data, billing, plans, users, ads, banners, authentication, privacy, deployment, or business rule, it must stop before acting.
   - The AI must write exactly:
     `ESTOU ME COÇANDO PARA FAZER BESTEIRA, VOCE AUTORIZA?`
   - Immediately after that sentence, explain:
     - what it wants to do;
     - why it considered doing it;
     - which files, data, or production areas would be affected;
     - the risk and possible side effects;
     - what happens if it does nothing.
   - Continue only after the user gives clear authorization.
   - This rule applies even when the AI believes the extra action would be helpful.

2. Never deploy without explicit safety confirmation.
   - Before any production deploy, ask the user for the exact phrase:
     `FACA DEPLOY AGORA`
   - Do not deploy if the phrase is missing, altered, translated, lowercase-only, or implied.
