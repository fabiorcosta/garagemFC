#!/bin/bash
# Duplo clique neste arquivo para gerar os anúncios a partir da pasta Fotos.
cd "$(dirname "$0")"

echo "=== Gerador de anúncios - Venda de garagem ==="
echo

# 1) Python
if ! python3 --version >/dev/null 2>&1; then
  echo "O Python 3 não está instalado."
  echo "Se apareceu uma janela pedindo para instalar as Ferramentas de Linha de Comando, clique em Instalar."
  echo "Ou instale em https://www.python.org/downloads/ . Depois rode este arquivo de novo."
  read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."; exit 1
fi

# 2) Ambiente isolado + bibliotecas (só na primeira vez)
if [ ! -d ".venv-catalogo" ]; then
  echo "Primeira execução: instalando o necessário (1-2 minutos)..."
  python3 -m venv .venv-catalogo || { echo "Falha ao criar ambiente Python."; read -n 1 -s -r; exit 1; }
  ./.venv-catalogo/bin/pip install -q --upgrade pip
  ./.venv-catalogo/bin/pip install -q anthropic pillow pillow-heif requests || { echo "Falha ao instalar bibliotecas."; read -n 1 -s -r; exit 1; }
  echo "Instalado."
  echo
fi
# garante bibliotecas adicionadas em versões novas do script
./.venv-catalogo/bin/pip install -q requests >/dev/null 2>&1

# 3) Chave da API: usa SÓ a chave deste projeto (ignora qualquer chave antiga do Mac)
unset ANTHROPIC_API_KEY
ARQ_CHAVE="$HOME/.config/garage-sale/chave-anthropic"
pedir_chave() {
  echo "Cole sua chave da API da Anthropic (começa com sk-ant-) e pressione Enter."
  echo "(o texto não aparece enquanto você cola, é normal)"
  read -s CHAVE; echo
  CHAVE="$(printf "%s" "$CHAVE" | tr -d '[:space:]')"
  mkdir -p "$(dirname "$ARQ_CHAVE")"
  printf "%s" "$CHAVE" > "$ARQ_CHAVE"; chmod 600 "$ARQ_CHAVE"
  echo "Chave salva."; echo
}
[ -s "$ARQ_CHAVE" ] || pedir_chave

# 4) Rodar (se a chave for recusada, pede de novo)
while true; do
  ANTHROPIC_API_KEY="$(cat "$ARQ_CHAVE")" ./.venv-catalogo/bin/python gerar_catalogo.py "./Fotos" "$@"
  [ $? -eq 2 ] || break
  echo "A chave foi recusada. Vamos tentar de novo."; echo
  pedir_chave
done

echo
echo "Abrindo o arquivo com todos os anúncios..."
open "./Fotos/anuncios.txt" 2>/dev/null
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
