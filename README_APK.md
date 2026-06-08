# APK Android de teste publico

Este projeto foi configurado como um app Android de teste usando Capacitor sobre o app web Next.js existente.

## Tecnologia identificada

- Next.js 14 com React 18 e TypeScript.
- Supabase PostgreSQL para banco de dados.
- Supabase Storage configurado por variaveis de ambiente.
- Firebase Web/Admin presente no projeto.
- Capacitor Android adicionado para empacotar o app em APK.

Como o projeto usa rotas API do Next.js, Supabase e autenticacao no servidor, o APK de teste abre o servidor Next.js dentro de um WebView. Para testes fora da rede local, este build usa uma URL publica temporaria via Cloudflare Tunnel.

## APK gerado

Arquivo gerado:

```powershell
C:\Users\dougl\achei-x\android\app\build\outputs\apk\debug\app-debug.apk
```

Nome do aplicativo:

```text
Achei X
```

ID Android:

```text
br.com.acheix.app
```

Ambiente:

```text
Desenvolvimento
```

Compatibilidade minima:

```text
Android 10 ou superior
```

## Antes de abrir no celular

Neste build, o APK foi gerado apontando para:

```text
https://acheix.com.br
```

Para o app funcionar para outras pessoas, publique o servidor em `https://acheix.com.br`. Depois, teste no navegador do celular:

```text
https://acheix.com.br
```

Se abrir no navegador, o APK tambem deve conseguir abrir.

## Corrigir ERR_CONNECTION_REFUSED

Se o app instalar, mas abrir com `ERR_CONNECTION_REFUSED`, o APK nao conseguiu conectar no servidor Next.js do computador.

Confira nesta ordem:

1. O servidor precisa estar rodando:

```powershell
npm run dev -- -H 0.0.0.0
```

2. Confirme que o dominio `acheix.com.br` esta apontando para a hospedagem publica do app.

3. Abra no navegador do celular:

```text
https://acheix.com.br
```

Se tambem falhar no navegador, o problema nao e o APK; e acesso ao servidor/tunel publico.

4. Libere a porta 3000 no Firewall do Windows. Abra o PowerShell como Administrador e rode:

```powershell
New-NetFirewallRule -DisplayName "Achei X Next Dev 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

5. Se a URL publica mudar, gere o APK de novo com a nova URL:

```powershell
$env:CAP_SERVER_URL="https://NOVA_URL_PUBLICA"
npm run android:debug
```

6. Alternativa sem firewall: conecte o celular via USB, ative Depuracao USB, autorize o computador no celular e use:

```powershell
C:\Users\dougl\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000
$env:CAP_SERVER_URL="http://127.0.0.1:3000"
npm run android:debug
```

Depois reinstale o novo APK gerado.

## Como instalar o APK no celular

1. Copie o arquivo abaixo para o celular:

```powershell
C:\Users\dougl\achei-x\android\app\build\outputs\apk\debug\app-debug.apk
```

2. No Android, permita instalar apps de fontes desconhecidas para o app que abriu o arquivo, como Gerenciador de arquivos, WhatsApp, Drive ou navegador.

3. Toque no APK e instale.

4. Abra o app `Achei X`.

5. Mantenha o servidor local e o tunel publico rodando no computador.

## Gerar novamente o APK para celular fisico

Se o IP do computador mudar, descubra o novo IP Wi-Fi:

```powershell
Get-NetIPAddress -AddressFamily IPv4
```

Para teste publico, gere o APK apontando para a URL do tunel:

```powershell
$env:CAP_SERVER_URL="https://SUA_URL_PUBLICA"
npm run android:debug
```

Exemplo deste build:

```powershell
$env:CAP_SERVER_URL="https://acheix.com.br"
npm run android:debug
```

O APK sera recriado em:

```powershell
android\app\build\outputs\apk\debug\app-debug.apk
```

## Gerar APK de release futuramente

O projeto ja tem script inicial para release:

```powershell
npm run android:release
```

Para distribuir fora de debug, ainda sera necessario configurar assinatura Android de release, como keystore, alias e senhas no Gradle.

## Validacoes feitas

- `npm run build` passou com sucesso.
- `npm run android:debug` passou com sucesso.
- Capacitor sincronizou o Android com a URL publica de teste.
- APK debug foi gerado.
- Supabase e banco de dados nao foram alterados.
- Variaveis de ambiente existentes foram preservadas.

## Observacoes sobre funcionalidades

- Login e cadastro dependem do servidor Next.js local, do tunel publico ativo e das variaveis `.env`.
- Upload de imagens usa a rota `/api/uploads/listing-photo` e preserva a integracao existente com Supabase Storage.
- Navegacao funciona dentro do WebView apontando para a URL publica configurada.
- Videos funcionam como conteudo web normal, desde que as URLs usadas estejam acessiveis pelo celular.
- Notificacoes locais nativas ainda nao foram adicionadas como plugin Capacitor; o projeto atual registra notificacoes no backend e preferencias no app.
- Para testar Supabase no celular, confirme que o servidor local consegue acessar o banco e que o bucket configurado em `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` existe.

