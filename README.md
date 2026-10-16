# demonios.site

Site estático de vocau e vivi com perfis do Discord pelo Lanyard.

## Publicação

GitHub Pages: branch `main`, diretório `/ (root)`. Domínio personalizado: `demonios.site`.
O repositório é público conforme solicitado pelo proprietário. Não contém tokens, senhas ou serviços do ChatGPT.

## Editar perfis e música

As configurações ficam em `config.js`. Os IDs configurados são `810012228425482240` e `1310932740048293929`.

A música configurada é “MEANT TO BE (HARDSTYLE)”, fornecida pelo proprietário. O arquivo `music.mp3` começa no trecho de 0:22 da faixa original e toca em repetição após o clique em “clique aqui para entrar”. O botão de som pausa e retoma a reprodução. Para trocar a faixa, substitua o arquivo ou ajuste `musicSrc` em `config.js`.

Os perfis flutuam lentamente em ciclos independentes de 8 e 9,5 segundos. O botão de animações pausa tanto as partículas quanto essa flutuação; o movimento também respeita a preferência de movimento reduzido do dispositivo. O favicon é uma cabeça de demônio com chifres.

O Lanyard atualiza nomes, avatares, presença e atividades por WebSocket. Se a conexão falhar, o site usa consultas periódicas, preserva os últimos dados e indica sua indisponibilidade. Cada usuário precisa permanecer no servidor https://discord.gg/lanyard.

## Prévia local

Na pasta dos arquivos: `python -m http.server 4173`. Abra `http://localhost:4173`.
Não precisa de Node.js, banco de dados ou chave de API para funcionar.

Fundo escolhido pelo proprietário: “Dark goat”, https://backiee.com/wallpaper/dark-goat/312480. O escurecimento é aplicado por CSS. O áudio do vídeo não foi incluído. `noindex` desestimula indexação em buscadores e não restringe acesso ao site.

Documentação do Lanyard: https://github.com/Phineas/lanyard
