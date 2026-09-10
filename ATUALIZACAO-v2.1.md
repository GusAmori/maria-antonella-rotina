# Atualizacao v2.1 - Crescimento e Ocorrencias

Esta atualizacao foi feita para o repositorio `maria-antonella-rotina` que ja esta conectado ao Supabase.

## O que entra

- data de nascimento continua no perfil da Antonella;
- peso e altura/comprimento atuais no perfil;
- nova medicao cria uma linha no historico;
- painel de crescimento na tela inicial;
- tabela de evolucao com data, idade, peso, altura e comparacao P3-P97;
- idade de referencia aproximada pela mediana mensal da OMS;
- novo atalho `Ocorrencia`, para registros como `Hoje a Antonella nao fez coco`;
- referencia OMS para meninas de 0 a 24 meses;
- aviso de seguranca: o app nao orienta emagrecimento, dieta ou ganho de peso.

## Importante: nao precisa alterar o Supabase

A v2.1 reaproveita a tabela `family_entries` que voce ja criou. Crescimento e ocorrencias sao gravados como tipos estruturados dentro da categoria tecnica `observacao`, entao **nao existe nova migration SQL nesta versao**.

## Como atualizar no GitHub

Se seu `config.js` ja contem sua Project URL e Publishable Key, **nao substitua o config.js**.

Substitua/adicione somente:

- `index.html`
- `styles.css`
- `app.js`
- `sw.js`
- `growth-reference.js` (novo)
- `README.md` (opcional, apenas documentacao)

Depois aguarde o GitHub Pages publicar novamente. No celular, feche e reabra o PWA. Se a versao antiga continuar aparecendo, remova o atalho/app instalado e instale de novo pela pagina publicada.

## Referencia de crescimento

A comparacao automatica usa as tabelas simplificadas oficiais da Organizacao Mundial da Saude (OMS) para meninas de 0 a 24 meses:

- Weight-for-age GIRLS, percentis.
- Length-for-age GIRLS, percentis.

O app mostra P3, mediana e P97 como referencia. A "idade de referencia aproximada" procura o mes cuja mediana esta mais proxima do peso e da altura informados. Isso **nao e idade biologica, diagnostico nem previsao de desenvolvimento**.

Para menores de 2 anos, a curva da OMS usa principalmente comprimento medido deitado. Leve as medicoes e a tendencia da curva para avaliacao da pediatra.
