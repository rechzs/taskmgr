# KAGE — Game Design

## 1. Visão do jogo

KAGE é um jogo de disciplina de uma única pessoa. O mundo não é um menu: ele é a representação persistente dos hábitos registrados. O dojo, o ninja, os três altares, os edifícios e o caminho devem comunicar o estado atual antes de qualquer texto.

O banco permanece como fonte de verdade. A apresentação do mundo é derivada de `pillars`, `checkins`, `weekly_awards` e `app_settings`; nenhuma animação pode conceder progresso que não tenha sido persistido.

Princípios:

1. Uma viewport, sem scroll da página.
2. Uma composição central legível antes de efeitos especiais.
3. Toda interação tem posição e consequência física no mundo.
4. O ninja é sempre um spritesheet de personagem inteiro; nunca é montado por membros no runtime.
5. O caminho mostra consequência, não uma porcentagem abstrata.
6. Shaders e pós-processamento só entram depois da aprovação da cena base.

## 2. Composição da WorldScene

A câmera inicial enquadra uma arena única, com leitura da frente para o fundo:

- **Primeiro plano:** início do caminho físico e pequenos fragmentos de pedra já conquistados.
- **Plano do personagem:** ninja inteiro no centro do dojo, com silhueta separada do piso.
- **Plano de missão:** três altares em semicírculo, ao alcance do ninja.
- **Plano de edifícios:** forja à esquerda, jardim-santuário à direita e biblioteca-templo atrás do ninja.
- **Plano de jornada:** caminho serpenteante que sai do dojo, conecta os edifícios e segue para o fundo.
- **Plano distante:** templo de troféus no eixo central, acima da linha do horizonte.

O centro deve concentrar o maior contraste. As laterais servem à composição e nunca funcionam como barras de botões.

Hierarquia de luminância:

1. Fundo distante: valor baixo e detalhe simplificado.
2. Cenário médio: formas, portas, telhados e vegetação legíveis.
3. Ninja: contorno e valores suficientes para separar roupa, rosto, arma e postura.
4. Altar ou edifício interativo: luz localizada e outline discreto somente durante foco/hover.
5. HUD: texto claro, sem grandes caixas opacas.

## 3. Loop diário

1. O jogador entra no dojo.
2. O mundo é reconstruído a partir do último check-in persistido.
3. Os altares obrigatórios do dia acendem; altares de descanso permanecem serenos e sem cobrança.
4. O jogador aproxima o ninja ou seleciona um altar.
5. A câmera se aproxima e o pergaminho diário abre.
6. O jogador marca Treino, Dieta e/ou Estudo e confirma com um selo.
7. A API persiste o check-in antes da recompensa audiovisual.
8. Após sucesso da API, cada missão concluída dispara sua reação física e constrói um trecho do caminho.
9. Missões obrigatórias não concluídas disparam o estado de falha do respectivo edifício e do ninja.
10. Ao recarregar, o mesmo estado visual deve reaparecer sem depender da animação anterior.

### Resultado do dia

- **Perfeito:** todas as missões obrigatórias do dia foram concluídas.
- **Parcial:** pelo menos uma missão obrigatória foi concluída, mas não todas.
- **Falha registrada:** existe check-in e nenhuma missão obrigatória foi concluída.
- **Falha por ausência:** o dia já passou, havia missão obrigatória e não existe check-in.
- **Descanso:** nenhuma missão ativa é obrigatória naquele dia.
- **Atual:** hoje ainda pode ser registrado.
- **Futuro:** não pode receber check-in antecipado.

## 4. Loop semanal

A semana sempre começa na segunda e termina no domingo.

1. Segunda-feira abre um novo capítulo visual do caminho.
2. Cada dia transforma uma sequência curta de pedras, degraus ou tábuas.
3. Dias perfeitos deixam o trecho íntegro e iluminado.
4. Dias parciais deixam o trecho construído apenas até as missões concluídas.
5. Falhas mantêm o trecho atravessável, porém rachado, frio e sem runas.
6. Domingo avalia todas as missões obrigatórias da semana.
7. Se todas foram concluídas, a API cria `weekly_awards` e inicia a TrophyScene.
8. A TrophyScene encerra o capítulo e revela o próximo marco semanal.
9. Se a semana falhar, o marco permanece incompleto e o próximo capítulo começa sem troféu; o histórico não é apagado.

## 5. Recursos

Os recursos são derivados do banco, sem uma nova economia paralela:

- **Ki:** `120` por missão concluída e penalidade de `60` por check-in vazio, nunca abaixo de zero. Controla apenas intensidade narrativa e postura; não compra itens.
- **Trechos construídos:** quantidade e qualidade derivadas das missões concluídas de cada dia.
- **Dias perfeitos:** dias em que todas as missões obrigatórias foram cumpridas.
- **Troféus:** quantidade real de registros em `weekly_awards`.
- **Capítulo atual:** semana segunda–domingo correspondente à data atual.
- **Objetivo final:** texto persistido em `app_settings.final_goal`.

## 6. Recompensas

### Por missão

- Animação completa do ninja `mission_complete`.
- Construção de uma parte física do caminho.
- Ativação do edifício correspondente.
- Luz e som localizados na fonte.
- Aumento de Ki derivado do check-in.

### Por dia perfeito

- Selo dourado no trecho do dia.
- Animação `victory` curta.
- Os três edifícios permanecem ativos até a troca do dia.
- O trecho diário recebe acabamento íntegro, runa e vegetação saudável.

### Por semana perfeita

- Registro único em `weekly_awards`.
- TrophyScene cinematográfica.
- Troféu instalado fisicamente no templo ao fundo.
- Marco semanal concluído e novo capítulo revelado.

## 7. Penalidades

Penalidade é comunicação visual, não punição destrutiva ou perda artificial de dados.

- Missão obrigatória perdida apaga o edifício correspondente.
- Check-in vazio aplica a animação completa `failure` ao ninja.
- O color grading base fica mais frio e menos saturado.
- O trecho daquele dia aparece rachado, com pedra deslocada ou tábua quebrada.
- Runas do dia apagam e a vegetação perde vigor.
- O Ki recebe a penalidade já existente de `60`, sem ficar negativo.
- Nenhuma falha remove troféus conquistados ou progresso histórico.

## 8. Estados do mundo

| Estado | Ninja | Altares | Edifícios | Caminho | Atmosfera |
|---|---|---|---|---|---|
| Inicial | `idle` | Obrigatórios acesos | Baixa atividade | Histórico visível | Neutra, legível |
| Aguardando check-in | `idle_wind` | Pulso localizado | Estado do último registro | Trecho de hoje incompleto | Brisa e som ambiente |
| Missão concluída | `mission_complete` | Selo aplicado | Edifício reage | Novo fragmento construído | Luz localizada |
| Dia perfeito | `victory` | Três selos | Todos ativos | Trecho íntegro | Temperatura mais quente |
| Falha | `failure` | Missão apagada | Correspondente apagado | Trecho danificado | Fria e dessaturada |
| Descanso | `meditation` | Serenos | Manutenção suave | Pedra de descanso | Calma, sem cobrança |
| Troféu | `trophy_ceremony` | Fora de foco | Templo domina | Capítulo concluído | Dourada e solene |

## 9. Altares e edifícios

Existem três altares físicos diante do ninja. Cada altar abre a mesma interface diária, mas destaca sua missão.

### Treino — altar do ferro e Forja

- **Apagado:** fornalha escura, bigorna fria, chaminé sem fumaça.
- **Ativo:** brasa vermelha, metal aquecido e fole em movimento.
- **Concluído:** golpe de martelo, porta iluminada e fragmentos metálicos localizados.
- **Reação persistente:** segmento de pedra reforçado por grampos metálicos.

### Dieta — altar da vida e Jardim-Santuário

- **Apagado:** vegetação retraída, água parada e lanternas apagadas.
- **Ativo:** folhas se movem, água corre e luz verde localizada aparece.
- **Concluído:** broto cresce, lanterna acende e pétalas surgem da própria vegetação.
- **Reação persistente:** segmento recebe musgo saudável, borda vegetal e água limpa.

### Estudo — altar da sabedoria e Biblioteca-Templo

- **Apagado:** janelas escuras, runas inertes e porta fechada.
- **Ativo:** páginas, vela e primeira runa acesa.
- **Concluído:** sequência de runas acende da base ao topo e a porta respira luz.
- **Reação persistente:** segmento recebe inscrição rúnica legível.

### Templo de troféus

- **Apagado:** silhueta legível, portões fechados.
- **Ativo:** uma luz por troféu conquistado e portão com brilho interno.
- **Concluído:** em uma semana perfeita, recebe o novo troféu e revela o próximo marco.

## 10. Caminho e progressão até 01/11/2026

O intervalo de 19/07/2026 a 01/11/2026 possui 106 dias. A progressão visual é organizada em:

- **Prólogo:** domingo, 19/07/2026, início da jornada.
- **15 capítulos semanais completos:** segunda, 20/07/2026, até domingo, 01/11/2026.
- **7 trechos por capítulo:** um por dia, respeitando dias de descanso.
- **Até 3 transformações por trecho:** uma para cada missão obrigatória concluída.

O caminho é físico e serpenteante. Quando encontra o limite do espaço útil, muda de direção por ponte, escada ou portal. A WorldScene mostra o dojo, o trecho atual e o próximo marco. A JourneyScene usa câmera própria para percorrer o histórico sem reduzir os 106 dias a pontos minúsculos.

Vocabulário físico por capítulo, repetido com variação de arte:

1. Pedra inicial.
2. Escada do pátio.
3. Ponte curta.
4. Portal de madeira.
5. Pedra de montanha.
6. Ponte suspensa.
7. Marco semanal diante de casa, forja, jardim, biblioteca, torre, santuário ou templo.

## 11. Condições de troféu

Um troféu semanal é concedido somente quando:

1. A semana avaliada vai de segunda a domingo.
2. Existe ao menos uma missão obrigatória na semana.
3. Todas as missões ativas e obrigatórias em seus respectivos dias foram concluídas.
4. O prêmio ainda não existia para aquela `week_start`.
5. O check-in de domingo foi persistido e a API confirmou `trophyAwarded: true`.

Alterar os dias obrigatórios recalcula a elegibilidade usando a configuração vigente, conforme a regra de negócio atual. O prêmio é idempotente por semana.

## 12. Animações do ninja

O ninja usa spritesheets de corpo inteiro, com escala, perspectiva e pivô consistentes em todos os frames.

| Animação | Uso | Loop | Leitura principal |
|---|---|---|---|
| `idle` | Estado neutro | Sim | Respiração e peso corporal |
| `idle_wind` | Aguardando check-in | Sim | Roupa e faixa ao vento; corpo estável |
| `mission_complete` | Uma missão persistida | Não | Passo, saque curto e retorno |
| `victory` | Dia perfeito | Não | Postura aberta e espada elevada |
| `failure` | Falha registrada | Não/hold | Ombros baixos e espada ao chão |
| `meditation` | Dia de descanso | Sim | Personagem sentado, respiração lenta |
| `trophy_ceremony` | TrophyScene | Não | Reverência, aproximação e pose final |

Regras do spritesheet:

- Personagem inteiro em todos os frames.
- Mesmo enquadramento, linha do chão e proporção anatômica.
- Sem separação de cabeça, torso ou membros no runtime.
- Sem deformação de malha aplicada ao corpo.
- Pivô visual nos pés; hitbox independente da transparência do frame.
- Animações precisam continuar legíveis sem partículas ou pós-processamento.

## 13. TrophyScene

Sequência base:

1. Corte para o templo com portões fechados.
2. Som grave e aproximação lenta da câmera.
3. Fogo dos dois braseiros acende.
4. Runas douradas percorrem o piso até os portões.
5. Portões abrem com fumaça e poeira originadas nas dobradiças e no chão.
6. Ninja executa `trophy_ceremony`.
7. Troféu surge sob luz dourada com fragmentos metálicos localizados.
8. Impacto de câmera e som grave confirmam a conquista.
9. O novo troféu é instalado e o próximo capítulo é revelado.

Proibido: confete colorido, partículas sem fonte ou modal HTML substituindo a cena.

## 14. HUD e interface React

O HUD é uma faixa discreta sem grandes caixas pretas:

- Objetivo final.
- Semana atual.
- Quantidade de troféus.
- Botão Missões.
- Botão Configurações.

React controla apenas pergaminhos/formulários acessíveis e chamadas de API. Phaser controla o mundo, a câmera e as respostas audiovisuais. Não existe edição inline.

## 15. Ordem de produção visual

1. Aprovar composição estática, luminância e escala do personagem.
2. Aprovar os sete spritesheets completos e os pivôs.
3. Implementar estados dos três edifícios e caminho físico sem shaders.
4. Implementar interações, câmera e resposta por missão.
5. Implementar TrophyScene base sem confete.
6. Somente então avaliar bloom seletivo, fog, heat distortion, normal-map lighting, dissolve, outline, color grading, vignette e displacement restrito a tecidos, fumaça e água.

## 16. Critérios de aceite e testes

Testes obrigatórios de lógica:

1. Concluir Treino ativa a forja e avança o trecho.
2. Concluir Dieta ativa o jardim e avança o trecho.
3. Concluir Estudo ativa a biblioteca e avança o trecho.
4. Concluir todas as missões obrigatórias cria dia perfeito.
5. Concluir todas as missões obrigatórias da semana concede um troféu único.
6. Falha registrada altera edifício, atmosfera, postura e trecho.
7. Caminho avança exatamente conforme as missões persistidas.
8. Recarregar produz o mesmo estado do mundo.

Critérios visuais mínimos antes de pós-processamento:

- O ninja e sua postura são identificáveis em desktop e mobile.
- Os três altares são simultaneamente visíveis na composição inicial.
- Forja, jardim, biblioteca e templo pertencem ao mesmo espaço físico.
- O caminho é reconhecível como construção física sem depender de linha ou HUD.
- Fundo, plano médio e foco central possuem luminâncias distintas.
- O mundo permanece compreensível com partículas e filtros desativados.
