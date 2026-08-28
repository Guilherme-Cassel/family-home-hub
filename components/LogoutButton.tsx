import { signOut } from '@/app/(auth)/actions'
import { IconButton } from '@/components/Button'
import { IconLogout } from '@/components/icons'

/**
 * Sair da conta, no canto da barra da tela de início.
 *
 * Fica só ali de propósito: a One UI concentra o que é de conta numa tela só,
 * em vez de repetir o botão no cabeçalho de todas as abas.
 */
export function LogoutButton() {
  return (
    <form action={signOut}>
      <IconButton type="submit" title="Sair" aria-label="Sair da conta">
        <IconLogout />
      </IconButton>
    </form>
  )
}
