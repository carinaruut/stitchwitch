/// <reference types="vite/client" />

declare module '*.yaml' {
  const messages: Record<string, any>
  export default messages
}
