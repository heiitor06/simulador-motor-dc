export type ModoMotor = 'realista' | 'raiox' | 'explodido'
export type PecaMotor = 'carcaca' | 'bobinas' | 'rotor' | 'eixo' | 'escovas'

export const pecas: Record<PecaMotor, { nome: string; formula: string; descricao: string }> = {
  carcaca: { nome: 'Carcaça e estator', formula: 'e = Ke · ω', descricao: 'O estator permanece fixo. Seu campo magnético participa da geração de torque e da tensão interna que se opõe à alimentação. A carcaça protege e sustenta o conjunto.' },
  bobinas: { nome: 'Bobinas de cobre', formula: 'L di/dt = V − Ri − Keω', descricao: 'Os enrolamentos da armadura conduzem a corrente. Resistência e indutância determinam sua evolução; a corrente produz o torque τe = Kt · i.' },
  rotor: { nome: 'Rotor', formula: 'J dω/dt = Kti − bω − τL', descricao: 'O conjunto girante acelera quando o torque eletromagnético supera o atrito e a carga. A inércia J resiste às mudanças de velocidade.' },
  eixo: { nome: 'Eixo e mancais', formula: 'τe = Kt · i   •   Pconv = τe · ω', descricao: 'O eixo transmite movimento à carga. Os mancais sustentam sua rotação; o modelo reúne o atrito viscoso no termo bω. Pconv é a potência convertida, antes das perdas mecânicas.' },
  escovas: { nome: 'Escovas e comutador', formula: 'τe = Kt · i', descricao: 'As escovas fazem contato com o comutador da armadura. A comutação mantém o torque no sentido desejado. O modelo usa valores médios, sem simular cada contato elétrico.' },
}
