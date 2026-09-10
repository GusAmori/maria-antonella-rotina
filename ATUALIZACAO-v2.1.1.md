# Atualizacao v2.1.1 - Medicao e idade

Correcoes e melhorias:

- Corrige o botao **+ Peso / altura** para abrir o registro de crescimento.
- Adiciona um segundo atalho no perfil da Antonella para registrar uma nova medicao.
- Peso e altura aceitam virgula ou ponto (ex.: `9,20` ou `9.20`).
- A idade passa a ser calculada pela data de nascimento em anos e meses completos.
- A idade aparece no topo, no painel inicial, no perfil e na area de evolucao.
- O Service Worker foi atualizado para `antonella-v2.1.1`, reduzindo problema de arquivos antigos em cache.

## Atualizacao no GitHub

Substitua `index.html`, `app.js`, `styles.css` e `sw.js`.

Nao substitua seu `config.js` se ele ja contem a URL e a Publishable Key do Supabase.

Depois do deploy, feche completamente o app no celular e abra novamente. Se uma versao antiga persistir, abra o site no navegador uma vez e recarregue a pagina.
