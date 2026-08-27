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
 * Id local da foto.
 *
 * `crypto.randomUUID` só existe em contexto seguro. Abrir o app pelo IP da
 * rede local (http://192.168.x.x:3000) para testar no celular não é contexto
 * seguro, e ali a função é `undefined` — o que derrubava a captura inteira.
 */
function novoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Dimensões e algo que o canvas saiba desenhar. */
type Decodificada = {
  fonte: CanvasImageSource
  largura: number
  altura: number
  liberar: () => void
}

/**
 * Decodifica a foto para o canvas.
 *
 * O caminho preferido é `createImageBitmap`, que respeita a orientação EXIF —
 * sem isso, foto tirada em pé chega deitada na IA. Mas ele falha em alguns
 * navegadores e com formatos como HEIC do iPhone, então há um plano B com
 * `<img>`, que os navegadores atuais também orientam pelo EXIF.
 */
async function decodificar(arquivo: File): Promise<Decodificada> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(arquivo, {
        imageOrientation: 'from-image',
      })
      return {
        fonte: bitmap,
        largura: bitmap.width,
        altura: bitmap.height,
        liberar: () => bitmap.close(),
      }
    } catch {
      // cai no plano B
    }
  }

  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new window.Image()
      elemento.onload = () => resolve(elemento)
      elemento.onerror = () =>
        reject(new Error('formato de imagem não suportado por este navegador'))
      elemento.src = url
    })

    return {
      fonte: img,
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    }
  } catch (erro) {
    URL.revokeObjectURL(url)
    throw erro
  }
}

/**
 * Comprime a foto antes de enviar.
 *
 * Uma foto de celular moderno passa de 4 MB, e um lote estouraria o limite de
 * corpo da requisição — além de gastar dados móveis à toa: para reconhecer uma
 * embalagem, 1024px de lado é de sobra.
 */
export async function comprimirImagem(arquivo: File): Promise<FotoCapturada> {
  const { fonte, largura, altura, liberar } = await decodificar(arquivo)

  try {
    if (!largura || !altura) {
      throw new Error('a imagem chegou com tamanho zero')
    }

    const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(largura * escala))
    canvas.height = Math.max(1, Math.round(altura * escala))

    const contexto = canvas.getContext('2d')
    if (!contexto) {
      throw new Error('este navegador não deixou usar o canvas')
    }

    contexto.drawImage(fonte, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG),
    )

    if (!blob) {
      throw new Error('a compressão não produziu imagem')
    }

    return {
      id: novoId(),
      preview: URL.createObjectURL(blob),
      enviavel: {
        mimeType: 'image/jpeg',
        data: await blobParaBase64(blob),
      },
    }
  } finally {
    liberar()
  }
}

/** Base64 puro, sem o prefixo `data:image/jpeg;base64,`. */
function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('falha ao ler a imagem'))
    leitor.onload = () => {
      const resultado = String(leitor.result)
      resolve(resultado.slice(resultado.indexOf(',') + 1))
    }
    leitor.readAsDataURL(blob)
  })
}
