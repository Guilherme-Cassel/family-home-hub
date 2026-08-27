/**
 * Copia texto para a área de transferência, com plano B.
 *
 * `navigator.clipboard` só existe em contexto seguro — abrir o app pelo IP da
 * rede local para testar no celular não é, e ali a API é `undefined`. Foi
 * exatamente essa armadilha que já derrubou a captura de fotos uma vez, então
 * aqui existe o caminho antigo com `execCommand`, que funciona sem contexto
 * seguro.
 *
 * Retorna false quando nenhum dos dois funcionou, para a tela poder oferecer
 * o texto para seleção manual em vez de mentir que copiou.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // Pode falhar por permissão negada; tenta o plano B.
    }
  }

  if (typeof document === 'undefined') return false

  try {
    const area = document.createElement('textarea')
    area.value = texto

    // Fora da tela, mas ainda focável: o execCommand exige seleção real.
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'

    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, texto.length)

    const copiou = document.execCommand('copy')
    document.body.removeChild(area)

    return copiou
  } catch {
    return false
  }
}
