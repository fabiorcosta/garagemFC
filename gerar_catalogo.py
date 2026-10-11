#!/usr/bin/env python3
"""
Coleta de informações para anúncios da venda de garagem.

Lê uma pasta com UMA SUBPASTA POR PRODUTO (1+ fotos cada) e, para cada produto:
  1. Identifica o item pelas fotos (Claude com visão)
  2. Pesquisa na web: preço novo nos EUA (US$) e no Brasil (R$), specs e melhores fotos oficiais
  3. Escreve título + descrição em português (traduzindo de sites dos EUA quando preciso)

Saída em TEXTO, pronta para copiar e colar nos campos do anúncio:
  <pasta do produto>/anuncio.txt      -> um arquivo ao lado das fotos de cada produto
  <pasta de entrada>/anuncios.txt     -> todos os produtos juntos

Uso:
  pip install anthropic pillow pillow-heif requests
  export ANTHROPIC_API_KEY=sk-ant-...         (Windows: set ANTHROPIC_API_KEY=...)
  python gerar_catalogo.py ./fotos              # processa só produtos sem anuncio.txt
  python gerar_catalogo.py ./fotos --forcar     # refaz todos
  python gerar_catalogo.py ./fotos --so 003-cafeteira
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
import sys
from html import unescape as html_unescape
from pathlib import Path
from urllib.parse import urljoin

import anthropic
import requests
from PIL import Image, ImageOps

try:  # fotos .HEIC do iPhone
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

# ----------------------------------------------------------------------------
# Configuração
# ----------------------------------------------------------------------------
MODELO = os.getenv("CATALOGO_MODELO", "claude-sonnet-5-5")
WEB_SEARCH_TOOL = {
    "type": "web_search_20260318",
    "name": "web_search",
    "max_uses": 8,  # teto de buscas por produto (controle de custo)
    "response_inclusion": "excluded",
}
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
MAX_FOTOS_POR_PRODUTO = 6
LADO_MAX_API = 1568
NOME_ARQUIVO = "anuncio.txt"
ARQ_CORRECAO = "modelo.txt"      # escreva aqui o produto/modelo certo para corrigir a identificação
PREFIXO_OFICIAL = "oficial-"     # fotos baixadas: oficial-01.jpg, oficial-02.jpg...
MAX_FOTOS_OFICIAIS = 4
TAMANHO_MIN_FOTO = 400           # ignora miniaturas (px no menor lado)
HEADERS_HTTP = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
}

ESTADOS = {
    "novo_lacrado": "Novo (lacrado)",
    "como_novo": "Usado - como novo",
    "bom": "Usado - bom estado",
    "regular": "Usado - estado regular",
    "com_defeito": "Com defeito / para peças",
}

# ----------------------------------------------------------------------------
# Prompts
# ----------------------------------------------------------------------------
PROMPT_IDENTIFICAR = """Você está catalogando itens de uma venda de garagem.
As {n} fotos acima são do MESMO produto. Nome da pasta (pode ter dica do dono): "{pasta}"

Leia etiquetas, plaquetas e embalagens nas fotos para achar marca e modelo.
Responda SOMENTE com um JSON:
{{
  "nome_provavel": "nome curto em português",
  "marca": "ou null",
  "modelo": "número/nome do modelo ou null",
  "categoria": "ex.: Eletrodomésticos, Móveis, Brinquedos, Ferramentas, Eletrônicos",
  "query_busca_en": "melhor busca em inglês para achar este produto novo à venda",
  "estado": "novo_lacrado | como_novo | bom | regular | com_defeito",
  "observacoes_estado": "marcas de uso, peças faltando etc., em português (curto)",
  "confianca": 0 a 1, de que marca/modelo estão corretos
}}"""

PROMPT_PESQUISAR = """Você está montando o anúncio de um item usado de uma venda de garagem.
Identificação feita a partir das fotos:
{identificacao}

Use a busca na web para:
1. Confirmar o produto exato (ou o equivalente atual mais próximo, se descontinuado).
2. Preço NOVO nos EUA em US$ (prefira Amazon.com, Walmart, Target, Best Buy, Home Depot ou fabricante).
3. Preço NOVO no Brasil em R$ (prefira Mercado Livre, Amazon.com.br, Magazine Luiza ou fabricante).
   Se não for vendido no Brasil, use null. Não converta o preço dos EUA.
4. Principais especificações (podem vir de sites em inglês; traduza).
5. Fotos oficiais: até 4 URLs, de preferência a PÁGINA OFICIAL DO PRODUTO no site do fabricante
   (ex.: ninja.com/..., hp.com/..., epson.com/...) e, se encontrar, URLs diretas de imagem em alta resolução.
   Prefira fundo branco. Não invente URLs: use só endereços que apareceram na busca.

Escreva o anúncio em português do Brasil, simpático e objetivo, sem exageros, mencionando
com honestidade o estado do item: "{obs_estado}".

Responda SOMENTE com um JSON:
{{
  "titulo": "até 70 caracteres",
  "descricao": "2 a 4 parágrafos curtos em português",
  "especificacoes": ["Item: valor", "..."],
  "produto_referencia": "nome exato do produto usado como referência de preço",
  "eh_equivalente": true se usou um similar por não achar o exato,
  "preco_novo_usd": {{"valor": número ou null, "loja": "...", "url": "..."}},
  "preco_novo_brl": {{"valor": número ou null, "loja": "...", "url": "..."}},
  "fotos_oficiais": ["https://..."]
}}"""


# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
def ler_correcao(pasta: Path) -> str | None:
    arq = pasta / ARQ_CORRECAO
    if not arq.exists():
        return None
    texto = " ".join(arq.read_text("utf-8", errors="ignore").split())
    return texto or None


def precisa_refazer(pasta: Path) -> bool:
    """modelo.txt criado/alterado depois do anuncio.txt => refazer este item."""
    anuncio, corr = pasta / NOME_ARQUIVO, pasta / ARQ_CORRECAO
    return corr.exists() and anuncio.exists() and corr.stat().st_mtime > anuncio.stat().st_mtime


def limpar_fotos_oficiais(pasta: Path) -> None:
    for f in pasta.glob(f"{PREFIXO_OFICIAL}*.jpg"):
        f.unlink()


def listar_fotos(pasta: Path) -> list[Path]:
    """Fotos tiradas pelo dono (ignora as oficiais baixadas pelo script)."""
    return sorted(
        p for p in pasta.iterdir()
        if p.suffix.lower() in EXTENSOES and not p.name.startswith(PREFIXO_OFICIAL)
    )[:MAX_FOTOS_POR_PRODUTO]


# ----------------------------------------------------------------------------
# Download das fotos oficiais
# ----------------------------------------------------------------------------
def _url_imagem_da_pagina(html: str, base: str) -> list[str]:
    achadas = []
    for padrao in (
        r'<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\'][^>]*content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:image|twitter:image)["\']',
    ):
        achadas += re.findall(padrao, html, re.I)
    return [urljoin(base, html_unescape(u)) for u in achadas]


def baixar_fotos(urls: list[str], pasta: Path, maximo: int = MAX_FOTOS_OFICIAIS) -> int:
    """Baixa imagens (URL direta ou página de produto, via og:image) como oficial-01.jpg, oficial-02.jpg..."""
    existentes = sorted(pasta.glob(f"{PREFIXO_OFICIAL}*.jpg"))
    numero = len(existentes)
    vistos = {hashlib.md5(f.read_bytes()).hexdigest() for f in existentes}
    salvas = 0
    fila = list(dict.fromkeys(u.strip(").,;'\"") for u in urls if u.startswith("http")))
    with requests.Session() as http:
        http.headers.update(HEADERS_HTTP)
        while fila and salvas < maximo:
            url = fila.pop(0)
            try:
                r = http.get(url, timeout=20)
                r.raise_for_status()
                tipo = r.headers.get("content-type", "")
                if "html" in tipo:
                    fila = _url_imagem_da_pagina(r.text, r.url)[:2] + fila
                    continue
                img = ImageOps.exif_transpose(Image.open(io.BytesIO(r.content)))
                if min(img.size) < TAMANHO_MIN_FOTO:
                    continue
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGBA")
                    fundo = Image.new("RGB", img.size, "white")
                    fundo.paste(img, mask=img.split()[-1])
                    img = fundo
                buf = io.BytesIO()
                img.convert("RGB").save(buf, "JPEG", quality=90)
                h = hashlib.md5(buf.getvalue()).hexdigest()
                if h in vistos:
                    continue
                vistos.add(h)
                numero += 1
                salvas += 1
                (pasta / f"{PREFIXO_OFICIAL}{numero:02d}.jpg").write_bytes(buf.getvalue())
            except Exception:  # noqa: BLE001  (site bloqueou, não é imagem etc.)
                continue
    return salvas


def bloco_imagem(caminho: Path) -> dict:
    img = ImageOps.exif_transpose(Image.open(caminho)).convert("RGB")
    img.thumbnail((LADO_MAX_API, LADO_MAX_API))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": "image/jpeg",
                   "data": base64.b64encode(buf.getvalue()).decode()},
    }


def extrair_json(texto: str) -> dict:
    blocos = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", texto, re.S)
    bruto = blocos[-1] if blocos else texto[texto.find("{"): texto.rfind("}") + 1]
    return json.loads(bruto)


def chamar(cliente, mensagens: list, tools: list | None = None, max_tokens=4000) -> str:
    """Chama a API, trata pause_turn (buscas longas) e devolve o texto final."""
    kwargs = {"model": MODELO, "max_tokens": max_tokens, "messages": mensagens}
    if tools:
        kwargs["tools"] = tools
    for _ in range(6):
        resp = cliente.messages.create(**kwargs)
        if resp.stop_reason != "pause_turn":
            break
        kwargs["messages"] = mensagens + [{"role": "assistant", "content": resp.content}]
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def fmt_preco(p: dict | None, moeda: str) -> str:
    if not p or p.get("valor") in (None, 0):
        return "não encontrado"
    valor = f"{p['valor']:,.2f}"
    if moeda == "R$":
        valor = valor.replace(",", "X").replace(".", ",").replace("X", ".")
    loja = f" ({p['loja']})" if p.get("loja") else ""
    url = f"\n  {p['url']}" if p.get("url") else ""
    return f"{moeda} {valor}{loja}{url}"


# ----------------------------------------------------------------------------
# Pipeline
# ----------------------------------------------------------------------------
def processar(cliente, pasta: Path) -> str:
    fotos = listar_fotos(pasta)
    print(f"  identificando ({len(fotos)} foto(s))...")
    conteudo = [bloco_imagem(f) for f in fotos]
    correcao = ler_correcao(pasta)
    texto_prompt = PROMPT_IDENTIFICAR.format(n=len(fotos), pasta=pasta.name)
    if correcao:
        print(f"  usando o modelo informado em {ARQ_CORRECAO}: {correcao}")
        texto_prompt += (
            f"\n\nIMPORTANTE: o dono informou que o produto é exatamente: \"{correcao}\". "
            "Isso está CORRETO e prevalece sobre o que você vê nas fotos. Use essa marca e modelo; "
            "use as fotos só para avaliar o estado do item."
        )
    conteudo.append({"type": "text", "text": texto_prompt})
    ident = extrair_json(chamar(cliente, [{"role": "user", "content": conteudo}], max_tokens=1500))
    if correcao:
        ident["produto_informado_pelo_dono"] = correcao
        ident["confianca"] = 1.0

    print(f"  pesquisando: {ident.get('query_busca_en')}")
    prompt = PROMPT_PESQUISAR.format(
        identificacao=json.dumps(ident, ensure_ascii=False, indent=2),
        obs_estado=ident.get("observacoes_estado") or ident.get("estado", ""),
    )
    if correcao:
        prompt += (
            f"\n\nO produto é EXATAMENTE \"{correcao}\" (informado pelo dono). Pesquise preços, "
            "especificações e fotos DESTE modelo, não de modelos parecidos da mesma marca."
        )
    pesq = extrair_json(chamar(cliente, [{"role": "user", "content": prompt}], tools=[WEB_SEARCH_TOOL]))

    avisos = []
    if float(ident.get("confianca") or 0) < 0.7:
        avisos.append("identificação incerta: confira marca/modelo")
    if pesq.get("eh_equivalente"):
        avisos.append(f"preço baseado em produto similar: {pesq.get('produto_referencia')}")
    if not (pesq.get("preco_novo_usd") or {}).get("valor"):
        avisos.append("preço nos EUA não encontrado")

    specs = "\n".join(f"- {s}" for s in pesq.get("especificacoes") or []) or "-"
    fotos_of = "\n".join(f"- {u}" for u in pesq.get("fotos_oficiais") or []) or "-"
    aviso_txt = ("⚠ REVISAR: " + "; ".join(avisos) + "\n\n") if avisos else ""

    urls_fotos = list(pesq.get("fotos_oficiais") or [])
    for chave in ("preco_novo_usd", "preco_novo_brl"):
        if (pesq.get(chave) or {}).get("url"):
            urls_fotos.append(pesq[chave]["url"])

    texto = f"""{aviso_txt}TÍTULO
{pesq.get('titulo') or ident.get('nome_provavel')}

CATEGORIA
{ident.get('categoria') or '-'}

ESTADO
{ESTADOS.get(ident.get('estado'), ident.get('estado') or '-')}

DESCRIÇÃO
{pesq.get('descricao') or '-'}

ESPECIFICAÇÕES
{specs}

MARCA / MODELO
{ident.get('marca') or '-'} / {ident.get('modelo') or '-'}

PREÇO NOVO - EUA
{fmt_preco(pesq.get('preco_novo_usd'), 'US$')}

PREÇO NOVO - BRASIL
{fmt_preco(pesq.get('preco_novo_brl'), 'R$')}

FOTOS OFICIAIS
{fotos_of}
"""
    return texto, urls_fotos


def main() -> None:
    ap = argparse.ArgumentParser(description="Coleta informações de anúncios a partir de fotos.")
    ap.add_argument("entrada", type=Path, help="pasta com uma subpasta por produto")
    ap.add_argument("--forcar", action="store_true", help="refaz produtos que já têm anuncio.txt")
    ap.add_argument("--so", help="processa só esta subpasta")
    ap.add_argument("--sem-fotos", action="store_true", help="não baixa fotos oficiais")
    args = ap.parse_args()

    if not args.entrada.is_dir():
        sys.exit(f"Pasta não encontrada: {args.entrada}")

    pastas = sorted(p for p in args.entrada.iterdir() if p.is_dir() and not p.name.startswith("."))
    if args.so:
        pastas = [p for p in pastas if p.name == args.so]

    cliente = anthropic.Anthropic()
    feitos = falhas = 0
    for pasta in pastas:
        destino = pasta / NOME_ARQUIVO
        if not listar_fotos(pasta):
            continue
        refazer = args.forcar or precisa_refazer(pasta)
        if destino.exists() and not refazer:
            # já tem anúncio: só baixa as fotos se ainda não baixou (sem custo de API)
            if not args.sem_fotos and not list(pasta.glob(f"{PREFIXO_OFICIAL}*")):
                urls = re.findall(r"https?://[^\s<>\"']+", destino.read_text("utf-8"))
                n = baixar_fotos(urls, pasta)
                print(f"▶ {pasta.name}: {n} foto(s) oficial(is) baixada(s)")
            continue
        print(f"\n▶ {pasta.name}")
        try:
            texto, urls = processar(cliente, pasta)
            if destino.exists():
                limpar_fotos_oficiais(pasta)  # as antigas podiam ser do modelo errado
            destino.write_text(texto, "utf-8")
            feitos += 1
            print(f"  ✓ {destino}")
            if not args.sem_fotos:
                n = baixar_fotos(urls, pasta)
                print(f"  ✓ {n} foto(s) oficial(is) baixada(s)")
        except anthropic.AuthenticationError:
            print("\n  ✗ CHAVE DA API INVÁLIDA.")
            sys.exit(2)
        except anthropic.BadRequestError as e:
            if "credit" in str(e).lower():
                print("\n  ✗ SEM CRÉDITOS na conta da API. Adicione saldo em platform.claude.com e rode de novo.")
                sys.exit(3)
            falhas += 1
            print(f"  ✗ falhou: {e}")
        except Exception as e:  # noqa: BLE001
            falhas += 1
            print(f"  ✗ falhou: {e}")

    # arquivo único com todos os anúncios
    todos = [
        f"{'=' * 60}\n{p.name}\n{'=' * 60}\n{(p / NOME_ARQUIVO).read_text('utf-8')}"
        for p in sorted(args.entrada.iterdir())
        if p.is_dir() and (p / NOME_ARQUIVO).exists()
    ]
    (args.entrada / "anuncios.txt").write_text("\n".join(todos), "utf-8")
    print(f"\nPronto: {feitos} novo(s), {falhas} falha(s). Tudo junto em {args.entrada / 'anuncios.txt'}")


if __name__ == "__main__":
    main()
