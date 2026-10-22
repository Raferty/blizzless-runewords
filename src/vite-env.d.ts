/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELEASE_DATE: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
