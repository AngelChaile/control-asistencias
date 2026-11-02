"""Extrae páginas de un PDF local para el buscador de convenios (sin servicios externos)."""
import argparse
import hashlib
import json
from pathlib import Path

from pypdf import PdfReader


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("salida", type=Path)
    parser.add_argument("--id", required=True)
    parser.add_argument("--titulo", required=True)
    args = parser.parse_args()
    paginas = [
        {"numero": numero, "texto": (pagina.extract_text() or "").strip()}
        for numero, pagina in enumerate(PdfReader(args.pdf).pages, start=1)
    ]
    documento = {
        "id": args.id,
        "titulo": args.titulo,
        "archivo": args.pdf.name,
        "sha256": hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
        "metodo": "texto del PDF",
        "paginas": paginas,
    }
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(json.dumps(documento, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{args.titulo}: {len(paginas)} páginas; {sum(len(p['texto']) for p in paginas)} caracteres.")


if __name__ == "__main__":
    main()
