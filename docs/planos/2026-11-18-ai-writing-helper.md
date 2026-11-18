# Plano: de Brand Voice Creator para AI Writing Helper

Data: 18 de novembro de 2026. Versão de partida: `44176e5` (depois da PR 2).

## Por que mudar

O site nasceu para a voz de uma marca, mas o uso real é mais amplo: escrever os textos de um site pessoal, uma newsletter, um projeto. A tese continua a mesma: ensinar uma IA a escrever do jeito de quem assina, com regras verificáveis e exemplos reais. O que muda é quem assina: uma pessoa, um projeto ou uma marca. A marca vira um dos casos, não o centro.

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Escopo | A voz de quem assina. Ajuda com a escrita em si (estrutura, gêneros, revisão) fica fora |
| Nome | AI Writing Helper |
| Situações | Gerais: boa notícia, má notícia, resposta a alguém |
| Textos de exemplo | Reescritos com assunto neutro, nas duas línguas |
| Endereço | Renomear o repositório agora: `feruiz.github.io/ai-writing-helper`. O site ainda não tem visitas, então o custo é zero |

## O que muda

| Onde | Antes | Depois |
|---|---|---|
| Nome e textos do site | Brand Voice Creator, "a voz da sua marca" | AI Writing Helper, "a sua voz de escrita" |
| Painel "The brand" | O que a marca faz, crenças da marca | "About the writing": sobre o que se escreve, quem lê, o que defende |
| Quem fala | Nós, Eu, A marca | Eu, Nós, Pelo nome (terceira pessoa) |
| Situações | Lançamento, falha no serviço, dúvida de cliente | Boa notícia, má notícia, resposta |
| Personagens prontos | Banco, app financeiro, fundador, marca provocadora, suporte | Acadêmico, colunista, newsletter próxima, redator técnico, instituição formal, marca provocadora |
| Assunto dos exemplos | Relatório mensal de uma financeira fictícia | Uma newsletter semanal fictícia: o lançamento, uma edição que saiu duplicada com links quebrados, um leitor que pergunta pelas edições antigas |
| Pedidos ao chat e `llms.txt` | "a voz da minha marca" | "a voz em que eu escrevo: minha, de um projeto ou de uma marca" |

**Por que uma newsletter:** serve tanto para uma pessoa quanto para uma organização, tem as três situações de forma natural, e é escrita, o que combina com o nome novo.

## Compatibilidade

Os nomes internos também mudam, porque o bloco que o chat lê precisa falar de escrita, não de marca:

| Antes | Depois |
|---|---|
| `brand` | `name` |
| `business` | `about` |
| quem fala `brand` | `byName` |
| situações `launch`, `outage`, `question` | `goodNews`, `badNews`, `reply` |
| marcador do bloco `brandVoiceCreator` | `aiWritingHelper` |

Tudo o que já foi salvo continua abrindo: o navegador, os links, os arquivos de configurações e os blocos antigos são traduzidos para os nomes novos na leitura.

## Como conferir

- Testes de migração: estado, link, arquivo e bloco antigos abrem com os nomes novos.
- O medidor aprova os textos montados das configurações iniciais e dos personagens prontos, nas duas línguas e nas três situações.
- Fluxo completo no navegador e no celular.
- `llms.txt` gerado de novo e em dia.

## Fora desta mudança

- A skill construtora de voz (antiga PR 3) vem depois.
- A pasta local continua `brand-voice-creator`; renomear a pasta é só local e pode ser feito a qualquer momento.
