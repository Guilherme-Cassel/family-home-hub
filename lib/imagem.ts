import type { FotoEnviada } from '@/types/ia'

/** Foto tirada no mercado, ainda só na memória do navegador. */
export type FotoCapturada = {
  id: string
  /** blob: URL para a miniatura. Precisa de revoke ao descartar. */
  preview: string
  enviavel: FotoEnviada
}

/** Maior lado da imagem depois de comprimir. */
const LADO_MAXIMO = 1024
const QUALIDADE_JPEG = 0.7

/**
 * Comprime a foto antes de enviar.
 *
 * Uma foto de celular moderno passa de 4 MB, e um lote de seis estouraria o
 * limite de corpo da requisição — além de gastar banda de dados no mercado, à
 * toa: para reconhecer uma embalagem, 1024px de lado é de sobra.
 *
 * `imageOrientation: 'from-image'` respeita o EXIF, senão fotos tiradas em pé
 * chegam deitadas na IA.
 */
export async function comprimirImagem(arquivo: File): Promise<FotoCapturada> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura

  const contexto = canvas.getContext('2d')
  if (!contexto) {
    bitmap.close()
    throw new Error('Não foi possível processar a imagem neste navegador.')
  }

  contexto.drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG),
  )

  if (!blob) {
    throw new Error('Não foi possível comprimir a imagem.')
  }

  return {
    id: crypto.randomUUID(),
    preview: URL.createObjectURL(blob),
    enviavel: {
      mimeType: 'image/jpeg',
      data: await blobParaBase64(blob),
    },
  }
}

/** Base64 puro, sem o prefixo `data:image/jpeg;base64,`. */
function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Falha ao ler a imagem.'))
    leitor.onload = () => {
      const resultado = String(leitor.result)
      resolve(resultado.slice(resultado.indexOf(',') + 1))
    }
    leitor.readAsDataURL(blob)
  })
}
