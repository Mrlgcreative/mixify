/** Les images importées par Metro sont des identifiants numériques. */
declare module '*.png' {
  const asset: number;
  export default asset;
}
