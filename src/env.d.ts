/// <reference types="vite/client" />

declare module '*.yaml' {
  const messages: Record<string, unknown>
  export default messages
}
