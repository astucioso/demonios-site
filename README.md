# demonios.site

Site estático de vocau e vivi com perfis do Discord pelo Lanyard.

## Publicação

GitHub Pages: branch `main`, diretório `/ (root)`. Domínio personalizado: `demonios.site`.
O repositório é público conforme solicitado pelo proprietário. Não contém tokens, senhas ou serviços do ChatGPT.

## Editar perfis e música

As configurações ficam em `config.js`. Os IDs configurados são `810012228425482240` e `1310932740048293929`.

A música está desativada até o envio da faixa escolhida. Para ativá-la, adicione `music.mp3` na raiz e configure `musicSrc: "music.mp3"` em `config.js`. Após o clique em “clique aqui para entrar”, a faixa começa em repetição. O botão de som pausa e retoma a reprodução. Sem arquivo configurado, o botão fica oculto.

O Lanyard atualiza nomes, avatares, presença e atividades por WebSocket. Se a conexão falhar, o site usa consultas periódicas, preserva os últimos dados e indica sua indisponibilidade. Cada usuário precisa permanecer no servidor https://discord.gg/lanyard.

## Prévia local

Na pasta dos arquivos: `python -m http.server 4173`. Abra `http://localhost:4173`.
Não precisa de Node.js, banco de dados ou chave de API para funcionar.

O fundo foi extraído de uma região sem perfis do vídeo de referência fornecido. O áudio do vídeo não foi incluído. `noindex` desestimula indexação em buscadores e não restringe acesso ao site.

Documentação do Lanyard: https://github.com/Phineas/lanyard
