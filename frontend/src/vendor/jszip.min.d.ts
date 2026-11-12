/* Tipos mínimos usados por EPULEAM; el código de JSZip está bajo licencia MIT/GPLv3. */
interface ArchivoZipJS { async(tipo: "string"): Promise<string> }
interface LibroZipJS {
  file(nombre: string): ArchivoZipJS | null;
  file(nombre: string, contenido: string): LibroZipJS;
  generateAsync(opciones: { type: "uint8array"; compression: "DEFLATE" }): Promise<Uint8Array>;
}
declare const JSZip: { loadAsync(contenido: ArrayBuffer): Promise<LibroZipJS> };
export default JSZip;
