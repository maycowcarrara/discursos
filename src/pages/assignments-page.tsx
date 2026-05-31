import { CalendarDays, Mail, MapPinned, Mic2, PencilLine } from 'lucide-react'

import { StatusPill } from '@/components/app/status-pill'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { nextSaturdayAssignment } from '@/data/mock-operations'

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

export function AssignmentsPage() {
  return (
    <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Nova designacao</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Estrutura visual preparada para o formulario oficial da Fase 8.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="assignment-date" className="text-sm font-medium">
                Data
              </label>
              <Input id="assignment-date" value="13/06/2026 (Sabado)" readOnly />
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-type" className="text-sm font-medium">
                Tipo de designacao
              </label>
              <select id="assignment-type" className={selectClassName} defaultValue="visitor">
                <option value="visitor">Orador visitante (vem falar aqui)</option>
                <option value="local">Saida de orador local (iremos falar la)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-congregation" className="text-sm font-medium">
                Congregacao
              </label>
              <select
                id="assignment-congregation"
                className={selectClassName}
                defaultValue="palmas-sul"
              >
                <option value="palmas-sul">Palmas Sul</option>
                <option value="gurupi-centro">Gurupi Centro</option>
                <option value="paraiso">Paraiso do Tocantins</option>
              </select>
              <p className="text-sm text-primary">Ver no mapa</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-speaker" className="text-sm font-medium">
                Orador
              </label>
              <select
                id="assignment-speaker"
                className={selectClassName}
                defaultValue="carlos"
              >
                <option value="carlos">Carlos Oliveira</option>
                <option value="jose">Jose Martins</option>
                <option value="marcos">Marcos Lima</option>
              </select>
              <p className="text-sm text-primary">Ver historico do orador</p>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="assignment-theme" className="text-sm font-medium">
                Tema
              </label>
              <select id="assignment-theme" className={selectClassName} defaultValue="84">
                <option value="84">84 - Como fortalecer a familia</option>
                <option value="91">91 - O valor da perseveranca</option>
                <option value="112">112 - Persevere ate o fim</option>
              </select>
            </div>

            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300">
              <p className="font-medium">Ultima apresentacao deste tema:</p>
              <p className="mt-2">143 dias atras</p>
              <p>14/01/2026 - Palmas Norte</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-status" className="text-sm font-medium">
                Status
              </label>
              <select id="assignment-status" className={selectClassName} defaultValue="pending">
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="declined">Recusado</option>
                <option value="cancelled">Cancelado</option>
                <option value="replaced">Substituido</option>
              </select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="assignment-notes" className="text-sm font-medium">
                Observacoes
              </label>
              <textarea
                id="assignment-notes"
                className="min-h-28 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Observacoes opcionais"
                maxLength={300}
              />
              <div className="text-right text-xs text-muted-foreground">0/300</div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground lg:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                Enviar e-mail de designacao agora
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                Adicionar ao Google Agenda
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar designacao</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">13/06/2026 - Sabado</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Painel lateral inspirado no mockup para consulta rapida do evento.
              </p>
            </div>
            <StatusPill status="confirmed">
              {nextSaturdayAssignment.status}
            </StatusPill>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1fr_240px]">
            <div className="space-y-4 rounded-[22px] border border-border/70 bg-background p-5">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium text-foreground">Discurso publico</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mic2 className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Orador</p>
                  <p className="font-medium text-foreground">
                    {nextSaturdayAssignment.speaker}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPinned className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Congregacao</p>
                  <p className="font-medium text-foreground">
                    {nextSaturdayAssignment.congregation}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tema</p>
                  <p className="font-medium text-foreground">
                    {nextSaturdayAssignment.theme}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[22px] border border-border/70 bg-background p-4">
              <p className="text-sm font-medium text-foreground">Acoes</p>
              <Button variant="outline" className="w-full justify-start">
                <PencilLine className="size-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                Cancelar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="size-4" />
                Enviar lembrete
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="size-4" />
                Ver no Google Agenda
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Regras oficiais lembradas aqui</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN001: nao permitir tema fora de `speakers.themeIds`.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN002 e RN003: bloquear congresso e assembleia.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN005: cancelamento muda status, nao apaga historico.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
