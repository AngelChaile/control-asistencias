import React, { useState } from "react";
import { CATEGORIAS_POR_GRUPO, categoriaDelCatalogo } from "../utils/catalogoCategorias.mjs";
import { normalizarDescripcion } from "../utils/regimenVacaciones.mjs";

export default function SelectorCategoria({ id, valor, cambiar, requerido = false }) {
  const [busqueda, setBusqueda] = useState("");
  const seleccion = categoriaDelCatalogo(valor) || valor;
  const palabras = normalizarDescripcion(busqueda).split(" ").filter(Boolean);
  const grupos = CATEGORIAS_POR_GRUPO.map(({ grupo, categorias }) => ({
    grupo,
    categorias: categorias.filter(categoria => {
      const texto = normalizarDescripcion(`${grupo} ${categoria}`);
      return palabras.every(palabra => texto.includes(palabra));
    }),
  })).filter(({ categorias }) => categorias.length > 0);
  const seleccionVisible = grupos.some(({ categorias }) => categorias.includes(seleccion));

  return <div className="space-y-2">
    <input
      type="search"
      className="input-modern"
      aria-label="Buscar en el catálogo de categorías"
      placeholder="Filtrar por grupo, número u horas"
      value={busqueda}
      onChange={event => setBusqueda(event.target.value)}
    />
    <select
      id={id}
      className="input-modern"
      value={seleccion}
      required={requerido}
      onChange={event => { cambiar(event.target.value); setBusqueda(""); }}
    >
      <option value="">Elegir categoría…</option>
      {seleccion && !seleccionVisible && <option value={seleccion}>{seleccion} (actual)</option>}
      {grupos.map(({ grupo, categorias }) => <optgroup key={grupo} label={grupo}>
        {categorias.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
      </optgroup>)}
    </select>
    {!grupos.length && <p className="text-xs text-muted" role="status">No hay categorías que coincidan con la búsqueda.</p>}
  </div>;
}
