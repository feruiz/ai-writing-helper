# Plano: o verificador também aponta vícios de texto de IA

Data: 18 de novembro de 2026. Versão de partida: `c016dc7` (depois da PR 3).

## Por que

A pesquisa sobre skills de escrita mostrou duas coisas:
- **O público está em "tirar cara de IA".** O humanizer tem cerca de 70 mil estrelas.
- **Ninguém confere isso por script.** Essas skills são só instruções, e o modelo se avalia sozinho.

O verificador do site já confere a voz por script. Ele passa a conferir também os vícios de IA que dá para detectar, em inglês e em português. Em português, isso não existe em nenhuma das ferramentas encontradas.

## Decisões

| Tema | Decisão |
|---|---|
| Onde entra | Uma linha nova no medidor, "AI tics", que vai também para o verificador exportado e para a skill |
| Quem vence | A voz. Cada tipo de vício pode ser desligado. Quando um texto aprovado usa um vício, o site avisa ao lado da caixa |
| O que entra | Só padrões com pouco alarme falso. Os de palavra comum valem por densidade, não por uma ocorrência |
| O que fica de fora do script | O que depende de sentido (sinônimos em rodízio, frase genérica, conclusão que repete o parágrafo). Vira instrução no guia |
| Lista de palavras proibidas | Volta a ser só da pessoa: começa vazia. As palavras de IA que estavam nela passam para a checagem nova. Quem tinha a lista padrão sem mexer recebe a lista vazia |
| Fontes | Listas próprias e curtas, montadas a partir de humanizer, stop-slop, no-ai-slop e vale-ai-tells (MIT), da skill "humanizar" (Apache-2.0) e da página da Wikipedia (CC BY-SA). Nada copiado na íntegra; crédito no README |

## Os tipos de vício

| Tipo | Exemplo | Quando acusa |
|---|---|---|
| Frases de chatbot | "Espero ter ajudado", "Ótima pergunta", "I hope this helps" | Uma ocorrência |
| Frases feitas | "No mundo atual", "Vamos mergulhar", "Em suma", "In conclusion" | Uma ocorrência |
| Grandiloquência | "papel fundamental", "é um testemunho de", "a testament to", "serves as a" | Uma ocorrência |
| Jargão da moda | "alavancar", "ecossistema", "robusto", "leverage", "seamless" | 3 ou mais, e 1,5 por 100 palavras |
| Fórmulas de contraste | "não apenas X, mas também Y", "não é X, é Y" | Uma ocorrência |
| Listas de três | "rápido, simples e barato" repetido | 2 ou mais, em pelo menos 20% das frases |
| Travessões | "—" em excesso | 3 ou mais, e mais de 1,5 por 100 palavras |
| Revelações | "O resultado? …", "A grande sacada é:" | Uma ocorrência |
| Gerúndio de análise | ", destacando…", ", highlighting…" | Uma ocorrência |
| Transições formais | "Além disso", "Moreover" no início da frase | 3 ou mais, ou a mesma duas vezes |
| Inícios repetidos | Três frases seguidas começando pela mesma palavra | Uma sequência |
| Formatação pesada | Títulos, rótulos em negrito ou emoji como marcador num texto curto | Conforme o caso |
| Burocratês | "vou estar enviando", "venho por meio deste", "please be advised" | Uma ocorrência |

## Onde aparece

- **Medidor:** a linha "AI tics" mostra o que achou e um trecho de cada ocorrência.
- **Verificador exportado:** cada vício achado sai numa linha, com trecho e correção.
- **Guia:** uma seção curta "Not like an AI" com os tipos ligados, mais as instruções do que o script não pega. A seção diz que, quando um exemplo aprovado faz uma dessas coisas, vale o exemplo.
- **Painel "Finish":** uma lista recolhível com uma caixa por tipo. Ao lado de cada uma, aparece se algum texto aprovado usa aquele vício.
- **Bloco do chat e `llms.txt`:** chave nova `allowedTics`, com os tipos que a voz usa de propósito.

## Como conferir

- Testes por tipo, com casos que devem acusar e casos que não devem, nas duas línguas.
- Os textos de exemplo da configuração inicial e dos personagens prontos continuam passando em todas as regras, agora incluindo esta.
- Teste de ponta a ponta do verificador exportado, que agora junta três arquivos.
