# Plano: Brand Voice Creator sem chave de API

Data: 18 de novembro de 2026. Versão de partida: `73adee0` (depois da PR 1).

## Por que mudar

A PR 1 levou o produto a depender de uma chave de API do Claude para três funções: diagnosticar textos, escrever a prévia e testar o guia. Isso restringe quem pode usar. O dono do site não pode oferecer a chave dele, e a maioria dos visitantes não tem uma. Além disso, o produto não deve ficar amarrado a um modelo nem a uma empresa.

O que já funciona sem chave e continua igual: os controles, a prévia montada, o medidor, o guia em Markdown, o verificador e o pacote de skill da voz.

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Chave de API | Remover de vez, junto com as chamadas ao Claude |
| Chat | Não existe chat dentro do site. A pessoa usa o chat dela (Claude, ChatGPT ou outro) |
| Quem conduz | O chat começa: entrevista a pessoa e lê os textos dela. O site ajusta: recebe o resultado, mostra os controles posicionados e exporta |
| Teste às cegas | Só na skill, por enquanto. No chat ele exigiria duas conversas e quatro copia-e-cola |
| Entrega | Duas PRs: primeiro o caminho do chat, depois a skill construtora |

## Como funciona o caminho do chat

1. No site, a pessoa clica em "Começar no chat". O site copia um pedido inicial.
2. Ela cola o pedido no chat dela. O modelo conduz a conversa: pergunta sobre a marca, pede textos reais e posiciona a voz na régua.
3. O modelo termina com um bloco de configurações.
4. Ela cola o bloco no site. Os controles se posicionam e as manias da marca aparecem com caixas para marcar.
5. Ela ajusta nos controles, vê a prévia e o medidor, e exporta o guia.
6. Se quiser continuar a conversa, copia de novo: o pedido passa a levar a voz atual.

### Cuidados de desenho

- **O pedido funciona sozinho.** Ele leva o essencial (instruções, régua resumida e formato da resposta) e cita o endereço de uma página do site para o modelo se aprofundar. Assim funciona também em chats que não navegam.
- **Página feita para modelos.** O site é montado por JavaScript, então um modelo que o visita hoje encontra uma casca vazia. A voz também não chega a ele pelo link, porque fica depois do `#`, que não é enviado a quem busca a página. A solução é publicar uma página de texto puro com a régua completa, os exemplos de cada degrau e o formato da resposta.
- **Os controles customizam o pedido, de forma opcional.** Site intocado: o pedido sai do zero. Site já mexido: o pedido leva o que foi preenchido como ponto de partida.
- **Leitura tolerante da resposta.** Sem a chave, nada garante o formato do que o modelo devolve. O site aproveita o que der, corrige valores fora da faixa e avisa o que ignorou.
- **Um formato comum.** O bloco que o modelo devolve usa o mesmo formato do arquivo de configurações que o site já exporta. Ele serve ao site, ao chat e, depois, à skill.

## PR 2: caminho do chat

| # | O que entra | O que a pessoa vê | Onde mexe |
|---|---|---|---|
| 1 | Página de texto para modelos, gerada dos mesmos dados do site | Nada; é para a IA ler | Arquivo novo na raiz, gerado por um script a partir de `js/data.js` |
| 2 | Botão "Começar no chat" | Copia o pedido inicial, com o estado atual dos controles se houver | Módulo novo de pedidos (reaproveita a régua e as instruções de manias de `js/claude.js`), `index.html`, `js/app.js` |
| 3 | Campo "Colar a resposta do chat" | Controles posicionados e manias com caixas para marcar, como no diagnóstico de hoje, com desfazer | `js/app.js`, `js/brand.js` |
| 4 | Leitura tolerante da resposta | Aviso do que foi aproveitado e do que foi ignorado | Módulo novo, com as limpezas que já existem em `js/brand.js` e `js/examples.js` |
| 5 | Prévia por copia-e-cola | "Copiar guia e pedido", colar o texto de volta; o medidor confere e dá para aprovar ou reprovar com motivo | `index.html`, `js/app.js` |
| 6 | Remoção da chave, das chamadas ao Claude e da tela de teste | Some o painel "With Claude" | `js/claude.js` sai; `index.html`, `js/app.js` |
| 7 | Textos do site e README neutros | "Sua IA" no lugar de "Claude" | `index.html`, `README.md` |

A pontuação do teste às cegas (`js/guide-test.js`) fica guardada no código, sem tela, para a PR 3 usar.

### Como conferir

- Leitura da resposta: testar com respostas tortas (bloco dentro de texto, campos faltando, valores fora da faixa, texto sem bloco nenhum).
- Fluxo no navegador: copiar, colar, ajustar, desfazer, exportar.
- A página para modelos não pode divergir de `js/data.js`: o script que a gera roda de novo e o resultado tem que ser igual ao arquivo salvo.
- Arquivos de configurações e links antigos continuam abrindo.
- **Teste manual, fora do alcance do código:** rodar o pedido inicial no Claude, no ChatGPT e no Gemini e colar a resposta de cada um no site.

### O que mudou na implementação

- **Item 3, manias sem caixas de marcar.** No diagnóstico antigo, as manias vinham com caixas porque ninguém tinha conferido antes. No chat, o modelo mostra a proposta e a pessoa confirma antes de receber o bloco, então marcar de novo no site seria repetir a conferência. O bloco já vem com as manias nos campos da marca (abertura, fecho, "nunca", pares, palavras). O site aplica, lista cada mudança com a evidência que o modelo deu e desfaz tudo com um botão.
- **A página para modelos é `llms.txt`.** É o nome que se convencionou para esse tipo de página. Também é servida como texto puro pelo GitHub Pages, sem passar pelo conversor de Markdown.
- **Itens a mais:**
  - A chave guardada por versões antigas é apagada do navegador na próxima visita.
  - A colagem aceita também o arquivo de configurações baixado do site.
  - A leitura entende os pronomes em português ("você", "nós") no lugar dos identificadores.
  - Um `package.json` sem dependências, só para rodar o gerador e os testes.

## PR 3: skill construtora de voz

Só o contorno; o plano detalhado vem depois da PR 2.

- Uma skill que **constrói** a voz, diferente da skill "voz da marca X" que o site já exporta e que serve para **escrever** com a voz. A construtora entrega a segunda no final.
- Num agente como o Claude Code, ela lê os textos da marca direto (do site ou da pasta do projeto), entrevista a pessoa e gera o guia e o verificador.
- Ela usa o mesmo código do site para montar o guia. Isso já foi testado: `buildGuide` roda fora do navegador, sem alteração.
- O teste às cegas volta aqui, com a leitura feita em contexto isolado e a pontuação de `js/guide-test.js`.
- O resultado inclui o arquivo de configurações, que abre no site para ajuste visual.

## Riscos conhecidos

| Risco | Como lidar |
|---|---|
| Qualidade varia entre modelos e planos gratuitos | O site confere o que volta, e o medidor continua valendo para qualquer texto |
| Chat que não navega ou se recusa a abrir o endereço | O pedido funciona sozinho; a página é complemento |
| Pedido longo demais para colar | Régua resumida no pedido, completa só na página |
| Pessoa cola a conversa inteira em vez do bloco | A leitura procura o bloco dentro do texto |
