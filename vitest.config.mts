import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Testes só da lógica pura: conversão de medida, agrupamento de entradas e a
 * higienização do que a IA devolve. Nada de renderizar tela.
 *
 * É onde mora o modo de falhar que dói neste app — número errado no estoque,
 * que ninguém vê na hora e só aparece dias depois, na cozinha.
 */
export default defineConfig({
  resolve: {
    // O mesmo apelido do tsconfig, que o Vitest não lê sozinho.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
