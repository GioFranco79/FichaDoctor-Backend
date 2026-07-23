/**
 * Utilidad de paginación para queries con Supabase
 * 
 * Proporciona funciones para calcular rangos de paginación compatibles
 * con el método .range(from, to) de Supabase y para construir metadata
 * de paginación estándar.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Calcula los parámetros de paginación para usar con Supabase .range(from, to)
 * @param {number} [page=1] - Número de página (1-indexed)
 * @param {number} [limit=20] - Cantidad de registros por página
 * @returns {{ from: number, to: number, page: number, limit: number }}
 */
function paginate(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const parsedPage = Math.max(1, Math.floor(Number(page) || DEFAULT_PAGE));
  const parsedLimit = Math.max(1, Math.floor(Number(limit) || DEFAULT_LIMIT));

  const from = (parsedPage - 1) * parsedLimit;
  const to = from + parsedLimit - 1;

  return {
    from,
    to,
    page: parsedPage,
    limit: parsedLimit
  };
}

/**
 * Construye la metadata de paginación a partir del total de registros
 * @param {number} total - Total de registros en la tabla/query
 * @param {number} page - Página actual (1-indexed)
 * @param {number} limit - Cantidad de registros por página
 * @returns {{ total: number, page: number, totalPages: number, limit: number }}
 */
function buildPaginationMeta(total, page, limit) {
  const parsedTotal = Math.max(0, Math.floor(Number(total) || 0));
  const parsedPage = Math.max(1, Math.floor(Number(page) || DEFAULT_PAGE));
  const parsedLimit = Math.max(1, Math.floor(Number(limit) || DEFAULT_LIMIT));

  const totalPages = parsedTotal === 0 ? 0 : Math.ceil(parsedTotal / parsedLimit);

  return {
    total: parsedTotal,
    page: parsedPage,
    totalPages,
    limit: parsedLimit
  };
}

module.exports = {
  paginate,
  buildPaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT
};
