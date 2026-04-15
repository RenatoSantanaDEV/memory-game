# Jogo da Memória

Jogo da memória para dois jogadores no navegador: nomes na tela inicial, partida em tabuleiro 4×4 com emojis, placar, log da partida e modal de fim de jogo.

## Como executar

Não é necessário instalar dependências.

### Abrir direto no navegador

Abra o arquivo `index.html` (duplo clique ou arrastar para o Chrome, Firefox ou Safari).

### Servidor HTTP local (opcional)

Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Acesse [http://localhost:8080](http://localhost:8080) e use `index.html` como entrada.

## Como jogar

1. Na página inicial, informe o nome de cada jogador e clique em **Iniciar Jogo**.
2. Os jogadores alternam ao virar duas cartas por vez.
3. Par formado: o jogador ganha um ponto e joga de novo.
4. Par errado: as cartas voltam e a vez passa para o outro.
5. Ao terminar todos os pares, o vencedor (ou empate) aparece no modal.

**Nova partida:** botão no cabeçalho da partida ou **Jogar novamente** no modal.

## Estrutura do projeto

| Caminho        | Descrição                          |
|----------------|-------------------------------------|
| `index.html`   | Tela de configuração (nomes)        |
| `game.html`    | Tela da partida                     |
| `css/index.css` | Estilos da landing                  |
| `css/game.css`  | Estilos do jogo e modal             |
| `js/index.js`   | Validação e redirecionamento        |
| `js/classes.js` | Modelo: cartas, jogadores, partida  |
| `js/game.js`    | Interface da partida (DOM)          |

## Tecnologias

HTML5, CSS3 e JavaScript (ES6+), sem frameworks e sem build.

## Licença

Uso educacional / projeto acadêmico — ajuste conforme necessário.
