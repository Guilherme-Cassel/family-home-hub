'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconArrowLeft, IconCheck, IconTrash } from '@/components/icons'
import { comprimirImagem, type FotoCapturada } from '@/lib/imagem'

type Props = {
  /** Chamado ao fechar, com tudo o que foi fotografado na sessão. */
  aoConcluir: (fotos: FotoCapturada[]) => void
  /** Câmera indisponível (sem permissão, sem HTTPS, sem dispositivo). */
  aoFalhar: (mensagem: string) => void
}

/**
 * Câmera dentro do app, para fotografar a compra inteira em sequência.
 *
 * O `<input capture>` do sistema abre a câmera do celular, que exige confirmar
 * cada foto e volta para o app a cada disparo — na prática, três toques por
 * produto. Aqui a prévia fica aberta: aponta, toca no botão, aponta no
 * próximo. As fotos ficam só na memória do navegador até "Concluir", que as
 * devolve para a tela de captura; nada sai do aparelho antes de processar.
 */
export function CameraContinua({ aoConcluir, aoFalhar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [pronta, setPronta] = useState(false)
  const [fotos, setFotos] = useState<FotoCapturada[]>([])
  const [capturando, setCapturando] = useState(false)
  const [flash, setFlash] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // O disparo é assíncrono (canvas → blob → compressão). Sem esta trava, dois
  // toques rápidos entravam ao mesmo tempo e a segunda foto saía repetida.
  const ocupadoRef = useRef(false)

  // O callback de falha vive no componente pai e muda de identidade a cada
  // render dele; guardá-lo numa ref evita que o efeito abaixo reabra a câmera.
  const aoFalharRef = useRef(aoFalhar)
  useEffect(() => {
    aoFalharRef.current = aoFalhar
  }, [aoFalhar])

  useEffect(() => {
    let cancelado = false

    async function abrir() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        aoFalharRef.current(
          'Este navegador não deixa abrir a câmera pelo app. Use "Da galeria" ou a câmera do celular.',
        )
        return
      }

      try {
        // `ideal` e não `exact`: em tablet ou notebook sem câmera traseira,
        // `exact` falha de vez em vez de cair na câmera que existe.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelado) {
          for (const trilha of stream.getTracks()) trilha.stop()
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setPronta(true)
      } catch (erro) {
        if (cancelado) return

        const nome = erro instanceof DOMException ? erro.name : ''
        aoFalharRef.current(
          nome === 'NotAllowedError'
            ? 'Permissão de câmera negada. Libere a câmera para este site nas configurações do navegador, ou use "Da galeria".'
            : nome === 'NotFoundError'
              ? 'Nenhuma câmera encontrada neste aparelho. Use "Da galeria".'
              : 'Não foi possível abrir a câmera. Use "Da galeria" ou a câmera do celular.',
        )
      }
    }

    abrir()

    return () => {
      cancelado = true
      const stream = streamRef.current
      if (stream) {
        for (const trilha of stream.getTracks()) trilha.stop()
        streamRef.current = null
      }
    }
  }, [])

  const capturar = useCallback(async () => {
    const video = videoRef.current
    if (!video || ocupadoRef.current) return

    const largura = video.videoWidth
    const altura = video.videoHeight
    if (!largura || !altura) return

    ocupadoRef.current = true
    setCapturando(true)
    setFlash(true)
    setAviso(null)

    try {
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura

      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('este navegador não deixou usar o canvas')

      contexto.drawImage(video, 0, 0, largura, altura)

      const bruta = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!bruta) throw new Error('a câmera não devolveu imagem')

      // Passa pelo mesmo redimensionamento das fotos escolhidas na galeria,
      // para o lote inteiro chegar à IA com o mesmo peso.
      const foto = await comprimirImagem(bruta)
      setFotos((atuais) => [...atuais, foto])
    } catch (erro) {
      setAviso(
        erro instanceof Error
          ? `Não foi possível guardar a foto: ${erro.message}.`
          : 'Não foi possível guardar a foto.',
      )
    } finally {
      ocupadoRef.current = false
      setCapturando(false)
      window.setTimeout(() => setFlash(false), 120)
    }
  }, [])

  function descartarUltima() {
    setFotos((atuais) => {
      const ultima = atuais[atuais.length - 1]
      if (ultima) URL.revokeObjectURL(ultima.preview)
      return atuais.slice(0, -1)
    })
  }

  // Volume/Enter/espaço disparam em teclado e em controles bluetooth de selfie,
  // sem atrapalhar quem só usa o botão na tela.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Enter' || evento.key === ' ') {
        const alvo = evento.target
        if (alvo instanceof HTMLButtonElement) return
        evento.preventDefault()
        capturar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [capturar])

  const ultima = fotos[fotos.length - 1]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Câmera">
      <div className="flex items-center justify-between px-2 py-2 text-white">
        <button
          type="button"
          onClick={() => aoConcluir(fotos)}
          aria-label="Fechar a câmera"
          className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/15"
        >
          <IconArrowLeft />
        </button>
        <p className="text-sm font-medium" aria-live="polite">
          {fotos.length === 0
            ? 'Nenhuma foto ainda'
            : `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`}
        </p>
        <div className="h-11 w-11" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-contain"
        />

        {flash ? <div className="absolute inset-0 bg-white/70" aria-hidden="true" /> : null}

        {!pronta ? (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/80">
            Abrindo a câmera…
          </p>
        ) : null}

        {aviso ? (
          <p className="absolute inset-x-4 bottom-4 rounded-item bg-black/70 px-3 py-2 text-center text-sm text-white">
            {aviso}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {ultima ? (
          <button
            type="button"
            onClick={descartarUltima}
            aria-label="Descartar a última foto"
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-item ring-1 ring-white/40"
          >
            <Image
              src={ultima.preview}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
              <IconTrash width={18} height={18} />
            </span>
          </button>
        ) : (
          <div className="h-14 w-14 shrink-0" />
        )}

        <button
          type="button"
          onClick={capturar}
          disabled={!pronta || capturando}
          aria-label="Tirar foto"
          className="h-19 w-19 shrink-0 rounded-full border-4 border-white bg-white/25 transition active:scale-95 disabled:opacity-40"
        >
          <span className="mx-auto block h-13 w-13 rounded-full bg-white" />
        </button>

        <button
          type="button"
          onClick={() => aoConcluir(fotos)}
          disabled={fotos.length === 0}
          className="flex h-14 min-w-14 shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-4 font-semibold text-on-fill disabled:opacity-40"
        >
          <IconCheck width={20} height={20} />
          Concluir
        </button>
      </div>
    </div>
  )
}
