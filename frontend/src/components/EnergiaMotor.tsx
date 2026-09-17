import type { Parametros, Ponto } from '../types'

export default function EnergiaMotor({ parametros: p, ponto, iniciado }: { parametros: Parametros; ponto: Ponto; iniciado: boolean }) {
  const conversao = p.kt * ponto.corrente * ponto.velocidade
  const valor = (n: number) => Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'
  return <section className="energia-resumo painel" aria-label="Conversão de energia">
    <div className="energia-cabecalho"><span className="sobretitulo">DA ELETRICIDADE AO MOVIMENTO</span><span>{iniciado ? 'Valores do instante simulado' : 'Condições iniciais'}</span></div>
    <div className="energia-caminho">
      <div><span>01 / Alimentação</span><strong>{valor(p.tensao * ponto.corrente)} <small>W</small></strong><code>Pentrada = V · i</code></div>
      <b aria-hidden="true">→</b>
      <div><span>02 / Conversão eletromecânica</span><strong>{valor(conversao)} <small>W</small></strong><code>Pconv = Kt · i · ω</code></div>
      <b aria-hidden="true">→</b>
      <div><span>03 / Potência na carga</span><strong>{valor(p.torque_carga * ponto.velocidade)} <small>W</small></strong><code>Pcarga = τL · ω</code></div>
    </div>
    <p>Os pulsos no eixo representam a potência convertida, antes das perdas mecânicas. Na aceleração, parte dela varia a energia cinética do rotor; outra parte vence o atrito e a carga.</p>
    {conversao < 0 && <p className="energia-nota">Potência convertida negativa: a conversão está no sentido mecânico → elétrico neste instante. Os pulsos invertem o sentido.</p>}
    {p.ke !== p.kt && <p className="energia-nota">Ke e Kt diferem numericamente. O balanço ideal de conversão elétrica/mecânica exige Ke = Kt em unidades SI consistentes.</p>}
    <small>Efeito didático, sem sensores externos. A névoa da base é apenas decorativa.</small>
  </section>
}
