# demonios.site

Site estático de vocau e vivi com perfis do Discord pelo Lanyard.

## Publicação

GitHub Pages: branch `main`, diretório `/ (root)`. Domínio personalizado: `demonios.site`.
O repositório é público conforme solicitado pelo proprietário. Não contém tokens, senhas ou serviços do ChatGPT.

## Editar perfis e música

As configurações ficam em `config.js`. Os IDs configurados são `810012228425482240` e `1310932740048293929`.

A música configurada é “Sabi, MIA BOYKA - Базовый минимум [Bare Minimum] (Slowed & Reverbed)”, fornecida pelo proprietário. O arquivo `music-bare-minimum-43s.mp3` começa no trecho de 0:43 da faixa original e toca em repetição após o clique em “clique aqui para entrar”. O botão de som pausa e retoma a reprodução. Para trocar a faixa, substitua o arquivo ou ajuste `musicSrc` em `config.js`.

Na entrada, o fundo aparece após 0,85s e os perfis entram individualmente aos 1,30s e 1,50s, crescendo de escala 0,5 até 1 com deslocamento vertical e opacidade. Cada entrada dura 0,5s e usa a curva `cubic-bezier(.215,.61,.355,1)`, ajustada pelos frames do vídeo de referência. Após a entrada, os perfis flutuam lentamente em ciclos independentes de 8 e 9,5 segundos. O botão de animações pausa tanto as partículas quanto essa flutuação; o movimento também respeita a preferência de movimento reduzido do dispositivo. O favicon é uma cabeça de demônio com chifres.

Os avatares usam 120px no desktop, 108px no celular e 100px em telas muito pequenas. O Lanyard atualiza nomes, avatares, presença e atividades por WebSocket, sem exibir o rótulo técnico de atualização. Se a conexão falhar, o site usa consultas periódicas, preserva os últimos dados e indica sua indisponibilidade. Cada usuário precisa permanecer no servidor https://discord.gg/lanyard.

## Prévia local

Na pasta dos arquivos: `python -m http.server 4173`. Abra `http://localhost:4173`.
Não precisa de Node.js, banco de dados ou chave de API para funcionar.

Fundo atual fornecido pelo proprietário: “the eyes chico / they never lie”, em `background-eyes-4k.png`. O PNG original de 3840 × 2160 pixels é preservado sem recompressão. O wallpaper é centralizado, sem filtros, desfoque, granulação ou zoom extra; o dimensionamento responsivo preserva as proporções. O áudio do vídeo não foi incluído. `noindex` desestimula indexação em buscadores e não restringe acesso ao site.

Documentação do Lanyard: https://github.com/Phineas/lanyard
