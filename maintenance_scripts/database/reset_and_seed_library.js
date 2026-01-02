require('dotenv').config();
const { list } = require('@vercel/blob');
const { pool } = require('../../database/db');

// Dicionário com dados detalhados (Seu dicionário original)
const EXERCISE_DATA = {
    'Abdominal Bicicleta - Image.png': {
        description: 'Exercício abdominal dinâmico que foca nos músculos oblíquos e reto abdominal.',
        execution_instructions: 'Deite-se de costas, mãos atrás da cabeça. Traga o joelho direito em direção ao cotovelo esquerdo enquanto estende a perna esquerda. Alterne os lados.',
        tips: 'Mantenha a lombar apoiada no chão e não force o pescoço.',
        recommendations: 'Realize movimentos controlados, sem pressa.',
        target_audience: 'Intermediário/Avançado'
    },
    'Abdominal Crunch - Image.png': {
        description: 'O movimento clássico para fortalecimento do reto abdominal superior.',
        execution_instructions: 'Deitado, joelhos flexionados, eleve apenas as omoplatas do chão contraindo o abdômen.',
        tips: 'Solte o ar ao subir e inspire ao descer.',
        recommendations: 'Não puxe a cabeça com as mãos; a força deve vir do abdômen.',
        target_audience: 'Iniciante'
    },
    'Abdominal Infra (Elevação de Pernas) - Image.png': {
        description: 'Focado na porção inferior do abdômen.',
        execution_instructions: 'Deitado, eleve as pernas estendidas ou semi-flexionadas até formar 90 graus, depois desça devagar.',
        tips: 'Coloque as mãos sob os glúteos para proteger a lombar.',
        recommendations: 'Evite tirar a lombar do chão durante a descida.',
        target_audience: 'Intermediário'
    },
    'Abdominal na Bola Suíça - Image.png': {
        description: 'Crunch realizado sobre a bola para maior amplitude e instabilidade.',
        execution_instructions: 'Apoie a lombar na bola, pés firmes no chão. Faça o movimento de crunch.',
        tips: 'A bola exige mais equilíbrio, ativando o core profundo.',
        recommendations: 'Olhe para um ponto fixo no teto.',
        target_audience: 'Intermediário'
    },
    'Afundo (Lunge) - Image.png': {
        description: 'Exercício unilateral poderoso para pernas e glúteos.',
        execution_instructions: 'Dê um passo à frente e flexione ambos os joelhos até 90 graus. Retorne à posição inicial.',
        tips: 'Mantenha o tronco ereto e o core ativado.',
        recommendations: 'O joelho da frente não deve ultrapassar muito a ponta do pé.',
        target_audience: 'Todos'
    },
    'Afundo com Halteres - Image.png': {
        description: 'Variação do afundo com carga extra para maior hipertrofia.',
        execution_instructions: 'Segure um halter em cada mão com os braços estendidos ao lado do corpo e execute o afundo.',
        tips: 'Mantenha os ombros para trás e peito aberto.',
        recommendations: 'Use uma carga que permita manter o equilíbrio.',
        target_audience: 'Intermediário'
    },
    'Agachamento Búlgaro (com Halteres) - Image.png': {
        description: 'Agachamento unilateral com o pé de trás apoiado, excelente para glúteos.',
        execution_instructions: 'Apoie o peito do pé de trás num banco. Agache com a perna da frente.',
        tips: 'Incline levemente o tronco à frente para focar mais no glúteo.',
        recommendations: 'Concentre a força no calcanhar da perna da frente.',
        target_audience: 'Avançado'
    },
    'Agachamento com Banda - Image.png': {
        description: 'Agachamento com resistência elástica para ativar glúteo médio.',
        execution_instructions: 'Coloque a mini-band acima dos joelhos e agache mantendo a tensão.',
        tips: 'Force os joelhos para fora contra a banda.',
        recommendations: 'Não deixe os joelhos caírem para dentro (valgo dinâmico).',
        target_audience: 'Iniciante/Intermediário'
    },
    'Agachamento Frente (Front Squat) - Image.png': {
        description: 'Variação com a barra à frente, focando mais em quadríceps e core.',
        execution_instructions: 'Apoie a barra nos deltoides frontais, cotovelos altos. Agache mantendo o tronco vertical.',
        tips: 'Requer boa mobilidade de punho e tornozelo.',
        recommendations: 'Mantenha os cotovelos apontando para frente durante todo o movimento.',
        target_audience: 'Avançado'
    },
    'Agachamento Livre (Air Squat) - Image.png': {
        description: 'O movimento fundamental de agachar usando apenas o peso do corpo.',
        execution_instructions: 'Pés na largura dos ombros, agache jogando o quadril para trás e para baixo.',
        tips: 'Mantenha os calcanhares no chão.',
        recommendations: 'Ótimo para aquecimento e aprendizado do movimento.',
        target_audience: 'Iniciante'
    },
    'Agachamento Livre (Back Squat) - Image.png': {
        description: 'O rei dos exercícios de perna, com barra nas costas.',
        execution_instructions: 'Barra no trapézio, agache até quebrar a paralela (quadril abaixo do joelho).',
        tips: 'Respire fundo e trave o abdômen antes de descer (Bracing).',
        recommendations: 'Mantenha a coluna neutra.',
        target_audience: 'Intermediário/Avançado'
    },
    'Agachamento Pistol (Unilateral) - Image.png': {
        description: 'Agachamento em uma perna só, exigindo força extrema e equilíbrio.',
        execution_instructions: 'Estenda uma perna à frente e agache completamente com a outra.',
        tips: 'Use um apoio ou TRX se for iniciante neste movimento.',
        recommendations: 'Cuidado com o joelho, requer muita estabilidade.',
        target_audience: 'Avançado'
    },
    'Agachamento Vazio (Squat to Reach) - Image.png': {
        description: 'Movimento de mobilidade torácica e quadril.',
        execution_instructions: 'Agache profundamente e rotacione o tronco elevando um braço para o teto.',
        tips: 'Sinta o alongamento nas costas e virilha.',
        recommendations: 'Faça como aquecimento.',
        target_audience: 'Todos'
    },
    'Alongamento de Adutores (Borboleta) - Image.png': {
        description: 'Alongamento para a parte interna das coxas.',
        execution_instructions: 'Sentado, junte as solas dos pés e deixe os joelhos caírem para os lados.',
        tips: 'Pressione levemente os joelhos para baixo com os cotovelos.',
        recommendations: 'Mantenha a coluna reta.',
        target_audience: 'Todos'
    },
    'Alongamento de BícepsBraço (Extensão) -Image.png': {
        description: 'Alongamento para bíceps e antebraço.',
        execution_instructions: 'Estenda o braço à frente com a palma para cima e puxe os dedos para baixo.',
        tips: 'Não force excessivamente o cotovelo.',
        recommendations: 'Segure por 20-30 segundos.',
        target_audience: 'Todos'
    },
    'Alongamento de Cadeia Posterior (Tocar os Pés) - Image.png': {
        description: 'Alongamento clássico para isquiotibiais e lombar.',
        execution_instructions: 'Em pé ou sentado, tente alcançar os pés com as mãos.',
        tips: 'Se não alcançar os pés, vá até onde conseguir sem dobrar os joelhos.',
        recommendations: 'Relaxe o pescoço.',
        target_audience: 'Todos'
    },
    'Alongamento de Cobra (Para Lombar) - Image.png': {
        description: 'Posição de yoga para extensão da coluna e abdominal.',
        execution_instructions: 'Deitado de bruços, empurre o chão com as mãos elevando o tronco.',
        tips: 'Olhe para cima e relaxe os glúteos.',
        recommendations: 'Se sentir pinçar a lombar, diminua a amplitude.',
        target_audience: 'Todos'
    },
    'Alongamento de Dorsal (Segurando em Algo) - Image.png': {
        description: 'Alongamento para a lateral das costas (latíssimo).',
        execution_instructions: 'Segure em um pilar ou batente e incline o corpo para trás lateralmente.',
        tips: 'Sinta alongar desde a axila até o quadril.',
        recommendations: 'Mantenha os pés fixos.',
        target_audience: 'Todos'
    },
    'Alongamento de Glúteos (Figura 4 Sentado) - Image.png': {
        description: 'Alivia tensão no quadril e glúteos.',
        execution_instructions: 'Sentado, cruze uma perna sobre a outra formando um "4" e incline o tronco.',
        tips: 'Quanto mais inclinar, maior o alongamento.',
        recommendations: 'Ótimo para quem trabalha sentado.',
        target_audience: 'Todos'
    },
    'Alongamento de Isquiotibiais Sentado - Image.png': {
        description: 'Foco na parte posterior da coxa.',
        execution_instructions: 'Sentado com uma perna estendida, incline-se em direção ao pé.',
        tips: 'Mantenha o pé fletido (dedos para cima).',
        recommendations: 'Respire fundo para relaxar o músculo.',
        target_audience: 'Todos'
    },
    'Alongamento de Ombros (Puxar Braço Sobre Peito) - Image.png': {
        description: 'Soltura para deltoides posteriores.',
        execution_instructions: 'Cruze um braço sobre o peito e pressione com o outro braço.',
        tips: 'Mantenha o ombro abaixado, longe da orelha.',
        recommendations: 'Segure por 15-20 segundos cada lado.',
        target_audience: 'Todos'
    },
    'Alongamento de Panturrilha na Parede - Image.png': {
        description: 'Essencial para evitar encurtamento do tríceps sural.',
        execution_instructions: 'Apoie a ponta do pé na parede e aproxime o corpo.',
        tips: 'Mantenha o calcanhar no chão.',
        recommendations: 'Faça após corridas ou treinos de perna.',
        target_audience: 'Todos'
    },
    'Alongamento de Peitoral na Porta - Image.png': {
        description: 'Abre o peito e melhora postura.',
        execution_instructions: 'Apoie o antebraço no batente da porta e gire o corpo para o lado oposto.',
        tips: 'Não gire a coluna, foque no ombro/peito.',
        recommendations: 'Faça bilateralmente.',
        target_audience: 'Todos'
    },
    'Alongamento de PsoasQuadril (Afundo Alongado) - Image.png': {
        description: 'Importante para flexores de quadril encurtados.',
        execution_instructions: 'Em posição de afundo, empurre o quadril para frente e para baixo.',
        tips: 'Contraia o glúteo da perna de trás.',
        recommendations: 'Mantenha o tronco ereto.',
        target_audience: 'Todos'
    },
    'Alongamento de Quadríceps (Em Pé) - Image.png': {
        description: 'Alongamento tradicional da coxa anterior.',
        execution_instructions: 'Em pé, segure o pé atrás e puxe o calcanhar em direção ao glúteo.',
        tips: 'Mantenha os joelhos alinhados, um ao lado do outro.',
        recommendations: 'Use uma parede para equilíbrio se necessário.',
        target_audience: 'Todos'
    },
    'Alongamento de TrapézioPescoço (Lateral) - Image.png': {
        description: 'Alívio de tensão cervical.',
        execution_instructions: 'Puxe suavemente a cabeça para o lado em direção ao ombro.',
        tips: 'Deixe o ombro oposto bem relaxado/caído.',
        recommendations: 'Não faça força excessiva.',
        target_audience: 'Todos'
    },
    'Alongamento de Tríceps (Braço Sobre a Cabeça) - Image.png': {
        description: 'Alongamento para a parte posterior do braço.',
        execution_instructions: 'Leve a mão às costas e empurre o cotovelo para baixo suavemente.',
        tips: 'Mantenha a cabeça ereta, não deixe o braço empurrá-la.',
        recommendations: 'Segure por 20s.',
        target_audience: 'Todos'
    },
    'Barra Fixa (Chin-Up - Pegada Supinada) - Image.png': {
        description: 'Barra fixa com palmas para você, foca em dorsais e bíceps.',
        execution_instructions: 'Pendure-se e puxe o corpo até o queixo passar da barra.',
        tips: 'Estenda totalmente os braços na descida.',
        recommendations: 'Use elástico de assistência se não conseguir subir.',
        target_audience: 'Intermediário'
    },
    'Barra Fixa (Pull-Up - Pegada Pronada) - Image.png': {
        description: 'Variação clássica para alargar as costas.',
        execution_instructions: 'Mãos afastadas, palmas para frente. Puxe o peito em direção à barra.',
        tips: 'Foque em puxar com os cotovelos, não com as mãos.',
        recommendations: 'Evite balançar o corpo (kipping) se o foco é hipertrofia.',
        target_audience: 'Avançado'
    },
    'Pulley Triângulo (Puxada Fechada) - Image.png': {
        description: 'Foco na parte central das costas e espessura.',
        execution_instructions: 'Sentado na polia, puxe o triângulo até o peito.',
        tips: 'Estufe o peito ao puxar e alongue bem na volta.',
        recommendations: 'Mantenha o tronco levemente inclinado para trás.',
        target_audience: 'Iniciante/Intermediário'
    },
    'Puxada Alta com Corda na Polia Alta - Image.png': {
        description: 'Variação para dorsais com maior amplitude (Face Pull ou Puxada Estendida).',
        execution_instructions: 'Puxe a corda em direção ao rosto ou peito, abrindo os cotovelos.',
        tips: 'Foco nos deltoides posteriores e parte alta das costas.',
        recommendations: 'Controle o retorno do peso.',
        target_audience: 'Intermediário'
    },
    'Puxada de Braços com Banda (Simulando Pulley) - Image.png': {
        description: 'Exercício de costas usando elástico, ótimo para aquecimento ou casa.',
        execution_instructions: 'Prenda a banda no alto e puxe em direção ao corpo.',
        tips: 'Mantenha tensão na banda o tempo todo.',
        recommendations: 'Faça altas repetições.',
        target_audience: 'Iniciante'
    },
    'Pássaro-Cão (Bird-Dog) -Image.png': {
        description: 'Exercício de estabilidade de core e coordenação.',
        execution_instructions: 'Em quatro apoios, estenda braço direito e perna esquerda simultaneamente.',
        tips: 'Imagine que tem um copo de água nas costas e não pode derramar.',
        recommendations: 'Segure 2 segundos na posição estendida.',
        target_audience: 'Iniciante/Reabilitação'
    },
    'Remada Baixa com Barra - Image.png': {
        description: 'Exercício composto para espessura das costas.',
        execution_instructions: 'Tronco inclinado, puxe a barra em direção ao umbigo.',
        tips: 'Mantenha a coluna neutra, não arredonde as costas.',
        recommendations: 'Use o cinto se a carga for alta.',
        target_audience: 'Avançado'
    },
    'Remada Curvada com Barra - Image.png': {
        description: 'Um dos melhores construtores de massa para as costas.',
        execution_instructions: 'Inclina o tronco quase paralelo ao chão, puxe a barra no abdômen.',
        tips: 'Cotovelos passam rente ao corpo.',
        recommendations: 'Cuidado com a lombar.',
        target_audience: 'Intermediário/Avançado'
    },
    'Remada Máquina com Apoio de Peito- Image.png': {
        description: 'Remada segura isolando as costas sem sobrecarregar a lombar.',
        execution_instructions: 'Apoie o peito no pad e puxe as manoplas.',
        tips: 'Concentre-se em juntar as escápulas no final.',
        recommendations: 'Ajuste a altura do banco para que o apoio fique no esterno.',
        target_audience: 'Iniciante'
    },
    'Remada Unilateral com Haltere - Image.png': {
        description: 'Remada Serrote, excelente para corrigir assimetrias.',
        execution_instructions: 'Apoie mão e joelho no banco, puxe o halter com a outra mão.',
        tips: 'Puxe o halter em direção ao quadril, não ao ombro.',
        recommendations: 'Mantenha as costas retas.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - Costas (DorsaisTorácica) - Image.png': {
        description: 'Liberação miofascial para as costas.',
        execution_instructions: 'Role a parte superior das costas sobre o rolo.',
        tips: 'Cruze os braços para expor melhor a musculatura.',
        recommendations: 'Evite rolar sobre a lombar excessivamente.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - Glúteos - Image.png': {
        description: 'Alívio para tensão nos glúteos e piriforme.',
        execution_instructions: 'Sente sobre o rolo, cruze uma perna e incline para o lado do glúteo.',
        tips: 'Procure os pontos mais doloridos e segure.',
        recommendations: 'Respire fundo.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - Isquiotibiais - Image.png': {
        description: 'Liberação da parte posterior da coxa.',
        execution_instructions: 'Coloque o rolo sob as coxas e use as mãos para mover o corpo.',
        tips: 'Faça uma perna de cada vez para mais pressão.',
        recommendations: 'Role devagar.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - IT Band (Fascia Lateral) - Image.png': {
        description: 'Liberação da banda iliotibial (lateral da coxa).',
        execution_instructions: 'Deite de lado com o rolo sob a coxa e deslize.',
        tips: 'Geralmente é doloroso, vá com calma.',
        recommendations: 'Não role sobre a articulação do joelho.',
        target_audience: 'Corredores'
    },
    'Rolo de Espuma - Panturrilhas - Image.png': {
        description: 'Massagem para relaxar as panturrilhas.',
        execution_instructions: 'Apoie a panturrilha no rolo, cruze a outra perna por cima.',
        tips: 'Gire o pé para pegar as laterais.',
        recommendations: 'Ótimo pós-corrida.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - Peitoral - Image.png': {
        description: 'Ajuda a abrir os ombros e soltar o peitoral.',
        execution_instructions: 'Deite de bruços com o rolo sob o peito/ombro e role curto.',
        tips: 'Estenda o braço para melhor efeito.',
        recommendations: 'Cuidado com a pressão excessiva.',
        target_audience: 'Todos'
    },
    'Rolo de Espuma - Quadríceps - Image.png': {
        description: 'Liberação da parte frontal da coxa.',
        execution_instructions: 'De bruços, apoie as coxas no rolo e mova-se com os antebraços.',
        tips: 'Mantenha o corpo em prancha.',
        recommendations: 'Role até perto do quadril e até perto do joelho.',
        target_audience: 'Todos'
    },
    'Rosca Alternada com Halteres - Image.png': {
        description: 'Clássico para bíceps com rotação de punho.',
        execution_instructions: 'Em pé, suba um halter de cada vez, girando a palma para cima.',
        tips: 'Mantenha os cotovelos fixos ao lado do corpo.',
        recommendations: 'Não balance o tronco para ajudar.',
        target_audience: 'Todos'
    },
    'Rosca Concentrada - Image.png': {
        description: 'Isolamento total do pico do bíceps.',
        execution_instructions: 'Sentado, apoie o cotovelo na parte interna da coxa e flexione o braço.',
        tips: 'Não deixe o ombro ajudar no movimento.',
        recommendations: 'Controle bem a descida.',
        target_audience: 'Intermediário'
    },
    'Rosca Direta com Barra - Image.png': {
        description: 'O construtor de massa para bíceps.',
        execution_instructions: 'Segure a barra com palmas para cima, flexione os cotovelos.',
        tips: 'Evite jogar os cotovelos para frente.',
        recommendations: 'Mantenha postura ereta.',
        target_audience: 'Todos'
    },
    'Rosca Direta na Polia Baixa - Image.png': {
        description: 'Tensão constante no bíceps durante todo o movimento.',
        execution_instructions: 'Use uma barra curta na polia baixa e faça a flexão de braços.',
        tips: 'A polia mantém a tensão mesmo quando o braço está esticado.',
        recommendations: 'Bom para finalizar o treino.',
        target_audience: 'Iniciante'
    },
    'Rosca Scott Máquina - Image.png': {
        description: 'Isolamento de bíceps com apoio, impedindo "roubo".',
        execution_instructions: 'Apoie os braços no banco Scott e puxe a máquina.',
        tips: 'Estenda quase tudo, mas não trave o cotovelo no final.',
        recommendations: 'Ajuste o banco para a axila ficar encaixada.',
        target_audience: 'Iniciante/Intermediário'
    },
    'Rotação de Braços (PequenosGrandes Círculos) - Image.png': {
        description: 'Aquecimento articular para ombros.',
        execution_instructions: 'Com braços abertos, faça círculos pequenos e vá aumentando.',
        tips: 'Faça nos dois sentidos (horário e anti-horário).',
        recommendations: 'Essencial antes de treinos de peito/ombro.',
        target_audience: 'Todos'
    },
    'Rotação de Tronco - Image.png': {
        description: 'Mobilidade para coluna torácica.',
        execution_instructions: 'Em pé ou sentado, gire o tronco de um lado para o outro.',
        tips: 'Mantenha o quadril fixo, gire só a cintura para cima.',
        recommendations: 'Movimento controlado.',
        target_audience: 'Todos'
    },
    'Rotação de Tronco na Polia - Image.png': {
        description: 'Fortalecimento do core rotacional (Woodchopper).',
        execution_instructions: 'Segure a polia lateralmente e gire o tronco levando a alça para o outro lado.',
        tips: 'Use a força do abdômen, não só dos braços.',
        recommendations: 'Pés giram levemente para acompanhar.',
        target_audience: 'Intermediário'
    },
    'Shuffle (Deslocamento Lateral) - Image.png': {
        description: 'Exercício cardio e de agilidade.',
        execution_instructions: 'Desloque-se lateralmente rápido sem cruzar os pés.',
        tips: 'Mantenha os joelhos semi-flexionados (base atlética).',
        recommendations: 'Use para elevar a frequência cardíaca.',
        target_audience: 'Todos'
    },
    'Skipping Alto (Corrida Elevando Joelhos) - Image.png': {
        description: 'Cardio intenso e aquecimento.',
        execution_instructions: 'Corra no lugar elevando bem os joelhos em direção ao peito.',
        tips: 'Coordene com os braços.',
        recommendations: 'Aterrisse na ponta dos pés.',
        target_audience: 'Todos'
    },
    'Slam Ball (Arremesso de Medicine Ball) - Image.png': {
        description: 'Potência e explosão para o corpo todo.',
        execution_instructions: 'Levante a bola acima da cabeça e arremesse com força no chão.',
        tips: 'Use o corpo todo, agachando ao arremessar.',
        recommendations: 'Cuidado com o rebote da bola.',
        target_audience: 'Intermediário'
    },
    'Smith Machine - Image.png': {
        description: 'Barra guiada, usada para agachamentos, supinos e afundos.',
        execution_instructions: 'Varia conforme o exercício, mas a barra segue um trilho fixo.',
        tips: 'Posicione os pés corretamente para compensar a falta de movimento horizontal.',
        recommendations: 'Mais seguro para fazer sozinho.',
        target_audience: 'Todos'
    },
    'Step-Up com Halteres - Image.png': {
        description: 'Subida no banco, simulando escada com carga.',
        execution_instructions: 'Segurando halteres, suba em um banco ou caixa com uma perna e depois desça.',
        tips: 'Faça força no calcanhar da perna que está subindo.',
        recommendations: 'Mantenha o tronco alto na subida.',
        target_audience: 'Todos'
    },
    'Superman (Extensão de Costas) - Image.png': {
        description: 'Fortalecimento da lombar e paravertebrais.',
        execution_instructions: 'Deitado de bruços, eleve braços e pernas simultaneamente.',
        tips: 'Segure 1-2 segundos no topo.',
        recommendations: 'Olhe para o chão para não forçar o pescoço.',
        target_audience: 'Iniciante'
    },
    'Supino Máquina Horizontal - Image.png': {
        description: 'Exercício guiado para peitoral.',
        execution_instructions: 'Empurre as manoplas à frente estendendo os braços.',
        tips: 'Não desencoste as costas do banco.',
        recommendations: 'Ótimo para iniciantes ganharem força.',
        target_audience: 'Iniciante'
    },
    'Supino na Bola Suíça - Image.png': {
        description: 'Supino com instabilidade, ativando mais o core.',
        execution_instructions: 'Apoie as costas na bola e execute o supino com halteres.',
        tips: 'Mantenha o quadril elevado em ponte.',
        recommendations: 'Use cargas menores que no banco.',
        target_audience: 'Intermediário'
    },
    'Supino Reto com Halteres - Image.png': {
        description: 'Construtor de peitoral com maior amplitude que a barra.',
        execution_instructions: 'Deitado, empurre os halteres para cima unindo-os no topo.',
        tips: 'Desça os halteres até a linha do peito.',
        recommendations: 'Mantenha os pés firmes no chão.',
        target_audience: 'Todos'
    },
    'Terra Convencional (Deadlift) - Image.png': {
        description: 'Exercício de força total (costas, pernas, glúteos).',
        execution_instructions: 'Barra no chão, pegue na largura dos ombros, levante estendendo quadril e joelhos.',
        tips: 'Mantenha a barra colada na perna durante a subida.',
        recommendations: 'Coluna neutra é obrigatória. Não arredonde.',
        target_audience: 'Avançado'
    },
    'Terra Romeno (Stiff-Legged Deadlift) - Image.png': {
        description: 'Foco total em posteriores de coxa e glúteos.',
        execution_instructions: 'Com joelhos semi-flexionados, incline o tronco à frente descendo a barra rente à perna.',
        tips: 'Sinta alongar atrás da coxa.',
        recommendations: 'Vá apenas até onde sua coluna permitir sem curvar.',
        target_audience: 'Intermediário'
    },
    'Torção da Coluna Sentada -Image.png': {
        description: 'Mobilidade e alívio lombar.',
        execution_instructions: 'Sentado, gire o tronco para um lado usando a mão no joelho oposto como alavanca.',
        tips: 'Cresça a coluna antes de girar.',
        recommendations: 'Faça suavemente.',
        target_audience: 'Todos'
    },
    'Tríceps Banco (Dipping entre Bancos) - Image.png': {
        description: 'Exercício de peso corporal para tríceps.',
        execution_instructions: 'Apoie as mãos num banco atrás de você, pés noutro banco ou chão. Flexione os cotovelos.',
        tips: 'Mantenha as costas rente ao banco de apoio.',
        recommendations: 'Cuidado se tiver dores no ombro.',
        target_audience: 'Iniciante'
    },
    'Tríceps Coice (Kickback) - Image.png': {
        description: 'Isolamento de tríceps com halter.',
        execution_instructions: 'Tronco inclinado, cotovelo alto e fixo. Estenda o braço para trás.',
        tips: 'Só o antebraço se move.',
        recommendations: 'Use carga leve para focar na contração.',
        target_audience: 'Todos'
    },
    'Tríceps Corda na Polia Alta - Image.png': {
        description: 'Um dos melhores para a cabeça lateral do tríceps.',
        execution_instructions: 'Puxe a corda para baixo e abra as mãos no final do movimento.',
        tips: 'Cotovelos colados nas costelas.',
        recommendations: 'Não suba as mãos acima da altura do peito na volta.',
        target_audience: 'Todos'
    },
    'Tríceps Máquina com Corda - Image.png': {
        description: 'Variação similar à polia, mas em máquina específica.',
        execution_instructions: 'Estenda os braços empurrando a carga.',
        tips: 'Foco total na extensão do cotovelo.',
        recommendations: 'Mantenha postura.',
        target_audience: 'Iniciante'
    },
    'Tríceps Testa com Barra (Skull Crusher) - Image.png': {
        description: 'Construtor de massa para tríceps.',
        execution_instructions: 'Deitado, desça a barra em direção à testa dobrando os cotovelos.',
        tips: 'Mantenha os cotovelos apontando para o teto.',
        recommendations: 'Peça ajuda (spotter) se for usar muita carga.',
        target_audience: 'Intermediário'
    },
    'Tríceps Testa Máquina - Image.png': {
        description: 'Versão guiada do tríceps testa.',
        execution_instructions: 'Sentado, empurre o apoio para frente/baixo.',
        tips: 'Mantenha os cotovelos fechados.',
        recommendations: 'Seguro para iniciantes.',
        target_audience: 'Iniciante'
    },
    'Turkish Get-Up - Image.png': {
        description: 'Exercício funcional complexo de corpo total.',
        execution_instructions: 'Levante-se do chão segurando um peso acima da cabeça o tempo todo.',
        tips: 'Requer uma sequência específica de movimentos. Aprenda sem peso primeiro.',
        recommendations: 'Olhe sempre para o peso.',
        target_audience: 'Avançado'
    }
};

async function resetAndSeed() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("[ERRO] ERRO: BLOB_READ_WRITE_TOKEN não encontrado.");
        process.exit(1);
    }

    console.log("[INFO] Iniciando Reset e Seed da Biblioteca de Exercícios...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Apagar e Recriar Tabela
        console.log(" Recriando tabela 'exercise_library'...");
        await client.query("DROP TABLE IF EXISTS exercise_library CASCADE");
        await client.query(`
            CREATE TABLE exercise_library (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image_url TEXT,
                video_url TEXT,
                description TEXT,           
                execution_instructions TEXT, 
                tips TEXT,                  
                recommendations TEXT,       
                target_audience VARCHAR(100), 
                category VARCHAR(100) DEFAULT 'Geral',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. Buscar Arquivos no Blob
        console.log("[INFO] Buscando arquivos na pasta 'assets/' do Blob...");
        const { blobs } = await list({
            prefix: 'assets/',
            limit: 1000,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        console.log(`[INFO] Encontrados ${blobs.length} arquivos no Blob.`);

        // 3. Inserir Dados (COM FALLBACK)
        let count = 0;
        let matchedCount = 0;
        let genericCount = 0;

        for (const blob of blobs) {
            const rawFilename = blob.pathname.split('assets/')[1]; // Ex: "Agachamento%20Livre.png"
            if(!rawFilename) continue;

            // Decodifica URL (remove %20 etc)
            const decodedFilename = decodeURIComponent(rawFilename);

            // Busca no dicionário
            const info = EXERCISE_DATA[decodedFilename] || EXERCISE_DATA[rawFilename];

            // Limpa nome para exibição
            const displayName = decodedFilename
                .replace(' - Image', '')
                .replace('- Image', '')
                .replace(/\.(png|jpg|jpeg|webp)/i, '')
                .trim();

            if (info) {
                // Caso encontrado no dicionário
                await client.query(`
                    INSERT INTO exercise_library (
                        name, image_url, description, execution_instructions, tips, recommendations, target_audience
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    displayName,
                    blob.url,
                    info.description,
                    info.execution_instructions,
                    info.tips,
                    info.recommendations,
                    info.target_audience
                ]);
                matchedCount++;
            } else {
                // Caso NÃO encontrado (Fallback Genérico)
                await client.query(`
                    INSERT INTO exercise_library (
                        name, image_url, description, execution_instructions, tips, recommendations, target_audience
                    ) VALUES ($1, $2, 'Descrição em breve...', 'Consulte seu treinador.', 'Mantenha a postura.', 'Execução controlada.', 'Todos')
                `, [
                    displayName,
                    blob.url
                ]);
                genericCount++;
                console.log(`[AVISO] Genérico criado para: ${decodedFilename}`);
            }
            count++;
        }

        await client.query('COMMIT');
        console.log(`[OK] Sucesso Total! ${count} exercícios importados.`);
        console.log(`Detalhes: ${matchedCount} com dados completos | ${genericCount} genéricos (sem descrição).`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[ERRO] Erro fatal:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

resetAndSeed();
