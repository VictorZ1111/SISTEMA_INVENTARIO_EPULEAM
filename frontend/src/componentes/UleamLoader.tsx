import "../estilos/uleam-loader.css";

interface UleamLoaderProps {
  size?: number;
  texto?: string;
  horizontal?: boolean;
}

/**
 * Loader local de EP ULEAM. Los contornos vectoriales proceden de
 * frontend/src/assets/logos/LOGO_EP2.png: conserva la geometría y la
 * alineación original de ULEAM bajo la E, sin anillos ni círculos.
 */
const CONTORNOS_LOGO = [
  { id: "rojo-e", color: "rojo", recorrido: "M 61 239 L 96 235 L 136 227 L 184 214 L 212 204 L 213 180 L 113 180 L 111 178 L 115 158 L 117 156 L 219 156 L 221 137 L 223 132 L 223 124 L 80 124 L 63 226 L 61 231 Z" },
  { id: "rojo-p", color: "rojo", recorrido: "M 247 192 L 254 191 L 259 188 L 262 188 L 369 147 L 398 137 L 398 134 L 393 129 L 373 124 L 257 124 L 247 183 Z" },
  { id: "azul-e", color: "azul", recorrido: "M 213 230 L 154 252 L 96 268 L 72 272 L 72 274 L 207 274 Z" },
  { id: "azul-p", color: "azul", recorrido: "M 401 141 L 395 142 L 321 179 L 298 192 L 240 220 L 238 223 L 230 273 L 272 273 L 283 210 L 286 207 L 368 207 L 384 200 L 396 188 L 402 174 L 403 148 Z" },
  { id: "uleam-uleam-0", color: "uleam", recorrido: "M 60 286 L 56 314 L 56 330 L 58 335 L 66 339 L 80 338 L 87 333 L 90 325 L 95 286 L 85 287 L 80 323 L 75 328 L 68 323 L 72 296 L 72 286 Z" },
  { id: "uleam-uleam-1", color: "uleam", recorrido: "M 104 286 L 97 338 L 126 338 L 128 326 L 114 326 L 112 324 L 117 286 Z" },
  { id: "uleam-uleam-2", color: "uleam", recorrido: "M 140 286 L 133 338 L 165 338 L 166 327 L 149 327 L 147 325 L 147 319 L 150 316 L 164 316 L 165 306 L 152 306 L 150 304 L 150 299 L 153 296 L 170 296 L 171 286 Z" },
  { id: "uleam-uleam-3", color: "uleam", recorrido: "M 188 286 L 174 325 L 169 335 L 169 338 L 179 338 L 182 330 L 185 327 L 193 327 L 196 330 L 196 338 L 208 338 L 208 329 L 202 286 Z M 192 304 L 194 308 L 194 315 L 192 317 L 189 317 L 187 315 L 190 306 Z" },
  { id: "uleam-uleam-4", color: "uleam", recorrido: "M 222 286 L 217 316 L 215 338 L 224 338 L 227 310 L 229 304 L 231 306 L 234 338 L 242 337 L 253 306 L 255 307 L 253 317 L 251 338 L 262 338 L 269 286 L 252 286 L 243 310 L 241 309 L 239 286 Z" },
 ] as const;

export default function UleamLoader({
  size = 76,
  texto = "Cargando...",
  horizontal = false,
}: UleamLoaderProps) {
  return (
    <span
      className={`uleam-loader ${horizontal ? "uleam-loader--horizontal" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={texto}
    >
      <svg
        className="uleam-loader__logo"
        width={size}
        viewBox="48 116 363 231"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Solo el contorno: el interior permanece transparente durante toda la animación. */}
        {CONTORNOS_LOGO.map((parte, indice) => (
          <g
            className={`uleam-forma uleam-forma--${indice}`}
            key={parte.id}
          >
            <path
              className="uleam-forma__trazo"
              d={parte.recorrido}
              fill="none"
              stroke={parte.color === "rojo" ? "#ec3442" : parte.color === "azul" ? "#278de5" : "#20b65c"}
              strokeWidth={parte.color === "uleam" ? 2.4 : 2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
            />
          </g>
        ))}
      </svg>
      <span className="uleam-loader__texto" aria-hidden="true">{texto}</span>
    </span>
  );
}
