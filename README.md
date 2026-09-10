# Maria Antonella - Rotina em Familia v2.0

Aplicativo PWA para celular, pensado para Mae e Pai registrarem e consultarem juntos a rotina da Maria Antonella.

## O que mudou nesta versao

- Banco e autenticacao migrados de Firebase para **Supabase**.
- Mesmo padrao usado no projeto da Clinica Dra. Isadora: `config.js`, Supabase Auth, chave publica no frontend e seguranca real por **Row Level Security (RLS)**.
- Sincronizacao em tempo real entre os dois celulares com Supabase Realtime.
- Codigo da familia para vincular Mae e Pai sem compartilhar a mesma senha.
- Fotos originais foram substituidas no pacote por ilustracoes em estilo anime.
- Projeto pronto para publicar pelo GitHub Pages, Vercel ou outro host HTTPS.
- Modo demonstracao local continua disponivel.

## Funcionalidades

- Login individual para cada responsavel.
- Criacao de conta com e-mail ou nome de usuario.
- Perfis separados: Mae, Pai ou Responsavel.
- Nome e foto de perfil editaveis.
- Perfil da Maria Antonella com nome, foto e data de nascimento.
- Mamadeiras: horario, quantidade e tipo de leite.
- Refeicoes: o que foi oferecido.
- Rejeicoes: alimento/item recusado e reacao.
- Consultas: profissional, local, data e hora.
- Vacinas: nome, dose, data e hora.
- Remedios: medicamento, dose, data e hora.
- Banhos e observacoes.
- Linha do tempo compartilhada.
- Identificacao de quem registrou cada cuidado.
- Filtros por data e categoria.
- Exclusao de registros.
- Atualizacao em tempo real nos dois celulares.

## Estrutura do projeto

```text
antonella_app_v2/
├─ index.html
├─ styles.css
├─ app.js
├─ config.js
├─ manifest.json
├─ sw.js
├─ icon.svg
├─ assets/
│  ├─ anime-family.jpg
│  ├─ anime-baby.jpg
│  ├─ anime-mom.jpg
│  ├─ anime-dad.jpg
│  └─ anime-ui-concept.jpg
└─ supabase/
   └─ schema.sql
```

## 1. Criar um projeto no Supabase

Crie um projeto **separado** para a rotina da Maria Antonella. Nao e recomendado misturar estes dados com o projeto da clinica.

No Supabase, copie:

- Project URL
- Publishable key (ou a chave publica `anon`, dependendo da interface exibida no seu projeto)

Nunca coloque `service_role`, Secret key ou qualquer chave administrativa no GitHub ou no navegador.

## 2. Criar banco e RLS

No Supabase:

1. Acesse **SQL Editor > New query**.
2. Abra `supabase/schema.sql` deste projeto.
3. Cole todo o conteudo.
4. Execute.
5. Aguarde `Success. No rows returned`.

O script cria:

- `profiles`
- `families`
- `family_members`
- `family_entries`
- funcao segura para entrar em uma familia por codigo
- politicas RLS
- permissoes do papel `authenticated`
- Realtime nas tabelas compartilhadas

## 3. Configurar o aplicativo

Edite `config.js`:

```js
window.ANTONELLA_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabasePublishableKey: "SUA-CHAVE-PUBLICA",
  authRedirectUrl: "https://SEU-USUARIO.github.io/SEU-REPOSITORIO/",
  inactivityMinutes: 30,
  appVersion: "2.0.0",
  familyDisplayName: "Maria Antonella"
};
```

A chave publica pode ficar no frontend. A protecao dos dados depende das politicas RLS. **Nunca use a `service_role` no frontend.**

## 4. Authentication no Supabase

Em **Authentication > URL Configuration**:

- Site URL: coloque a URL oficial do app.
- Redirect URLs: adicione a mesma URL publicada no GitHub Pages/Vercel.

Em **Authentication > Providers > Email** mantenha Email/Password habilitado.

### E-mail real

Com e-mail real, voce pode deixar a confirmacao de e-mail habilitada. O usuario recebe o link, confirma e depois entra normalmente.

### Nome de usuario sem e-mail

Quando a pessoa digita apenas um nome de usuario, o app transforma internamente em algo como:

```text
u-gustavo@login.mariaantonella.app
```

Para esse modo funcionar, a confirmacao obrigatoria de e-mail precisa estar desabilitada, porque esse endereco e apenas um identificador interno. Para recuperacao de senha e maior seguranca, prefira usar e-mail real.

## 5. Fluxo da familia

### Primeiro responsavel

1. Clique em **Criar acesso**.
2. Informe nome, perfil, e-mail/usuario e senha.
3. Marque **Criar familia**.
4. Ao entrar, o Supabase cria a familia e gera um codigo de convite.

### Segundo responsavel

1. Clique em **Criar acesso** no outro celular.
2. Informe os dados do segundo responsavel.
3. Marque **Entrar com codigo**.
4. Informe o codigo exibido no primeiro celular.
5. Os dois passam a acessar a mesma rotina, cada um com a propria senha.

## 6. Publicar no GitHub Pages

Crie um repositorio, de preferencia **privado** enquanto estiver testando.

Depois envie todos os arquivos desta pasta para o repositorio.

No GitHub:

1. Acesse **Settings > Pages**.
2. Em **Build and deployment**, escolha deploy pela branch.
3. Selecione a branch principal e a pasta raiz.
4. Salve.
5. Copie a URL publicada e coloque em `authRedirectUrl` e no Supabase Authentication.

Depois de alterar `config.js`, faca novo commit/push.

## 7. Testar localmente

Nao abra apenas clicando em `index.html`. Rode um servidor local:

```bash
python -m http.server 8080
```

Abra:

```text
http://localhost:8080
```

Para testar autenticacao local, adicione tambem `http://localhost:8080` nas Redirect URLs do Supabase.

## 8. Seguranca

Este app registra dados de rotina, saude, alimentacao, medicamentos e imagens de uma crianca. Antes de uso real:

- mantenha RLS habilitado;
- use senhas fortes;
- use e-mails reais quando possivel;
- ative MFA para os responsaveis se desejar elevar a seguranca;
- mantenha o repositorio privado se houver imagens pessoais ou configuracoes internas;
- nunca armazene Secret key/service_role no frontend;
- revise periodicamente quem esta vinculado a familia;
- defina uma rotina de backup e exclusao de dados;
- considere LGPD e privacidade antes de compartilhar informacoes da crianca.

## 9. Fotos em anime

O pacote v2 nao inclui as duas fotos originais enviadas. Ele usa apenas as versoes ilustradas:

- `anime-family.jpg`
- `anime-baby.jpg`
- `anime-mom.jpg`
- `anime-dad.jpg`

A imagem `anime-ui-concept.jpg` fica como referencia visual do conceito de interface.

## Proximas melhorias sugeridas

- notificacoes push de mamadeira, remedio, consulta e vacina;
- campo de sono;
- troca de fraldas;
- grafico diario/semanal;
- calendario de vacinas;
- relatorio em PDF;
- lembrete de proxima mamadeira;
- historico de crescimento (peso/altura);
- exportacao e backup dos registros.

# GitHub Pages

Este projeto foi preparado para publicacao como site estatico/PWA no GitHub Pages. Configure o Supabase em `config.js` usando apenas a Project URL e a chave publica/publishable. Nunca publique `service_role`.
