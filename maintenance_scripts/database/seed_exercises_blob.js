require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { pool } = require('./db');

const EXERCISES_DIR = path.join(__dirname, '../exercicios');

// Dicionário completo com descrições baseadas nos nomes dos arquivos enviados
const EXERCISE_DATA = {
    'Abdominal Bicicleta - Image.png': {
        desc: 'Exercício abdominal dinâmico que foca nos músculos oblíquos e reto abdominal.',
        exec: 'Deite-se de costas, mãos atrás da cabeça. Traga o joelho direito em direção ao cotovelo esquerdo enquanto estende a perna esquerda. Alterne os lados.',
        dica: 'Mantenha a lombar apoiada no chão e não force o pescoço.',
        rec: 'Realize movimentos controlados, sem pressa.',
        alvo: 'Intermediário/Avançado'
    },
    'Abdominal Crunch - Image.png': {
        desc: 'O movimento clássico para fortalecimento do reto abdominal superior.',
        exec: 'Deitado, joelhos flexionados, eleve apenas as omoplatas do chão contraindo o abdômen.',
        dica: 'Solte o ar ao subir e inspire ao descer.',
        rec: 'Não puxe a cabeça com as mãos; a força deve vir do abdômen.',
        alvo: 'Iniciante'
    },
    'Abdominal Infra (Elevação de Pernas) - Image.png': {
        desc: 'Focado na porção inferior do abdômen.',
        exec: 'Deitado, eleve as pernas estendidas ou semi-flexionadas até formar 90 graus, depois desça devagar.',
        dica: 'Coloque as mãos sob os glúteos para proteger a lombar.',
        rec: 'Evite tirar a lombar do chão durante a descida.',
        alvo: 'Intermediário'
    },
    'Abdominal na Bola Suíça - Image.png': {
        desc: 'Crunch realizado sobre a bola para maior amplitude e instabilidade.',
        exec: 'Apoie a lombar na bola, pés firmes no chão. Faça o movimento de crunch.',
        dica: 'A bola exige mais equilíbrio, ativando o core profundo.',
        rec: 'Olhe para um ponto fixo no teto.',
        alvo: 'Intermediário'
    },
    'Afundo (Lunge) - Image.png': {
        desc: 'Exercício unilateral poderoso para pernas e glúteos.',
        exec: 'Dê um passo à frente e flexione ambos os joelhos até 90 graus. Retorne à posição inicial.',
        dica: 'Mantenha o tronco ereto e o core ativado.',
        rec: 'O joelho da frente não deve ultrapassar muito a ponta do pé.',
        alvo: 'Todos'
    },
    'Afundo com Halteres - Image.png': {
        desc: 'Variação do afundo com carga extra para maior hipertrofia.',
        exec: 'Segure um halter em cada mão com os braços estendidos ao lado do corpo e execute o afundo.',
        dica: 'Mantenha os ombros para trás e peito aberto.',
        rec: 'Use uma carga que permita manter o equilíbrio.',
        alvo: 'Intermediário'
    },
    'Agachamento Búlgaro (com Halteres) - Image.png': {
        desc: 'Agachamento unilateral com o pé de trás apoiado, excelente para glúteos.',
        exec: 'Apoie o peito do pé de trás num banco. Agache com a perna da frente.',
        dica: 'Incline levemente o tronco à frente para focar mais no glúteo.',
        rec: 'Concentre a força no calcanhar da perna da frente.',
        alvo: 'Avançado'
    },
    'Agachamento com Banda - Image.png': {
        desc: 'Agachamento com resistência elástica para ativar glúteo médio.',
        exec: 'Coloque a mini-band acima dos joelhos e agache mantendo a tensão.',
        dica: 'Force os joelhos para fora contra a banda.',
        rec: 'Não deixe os joelhos caírem para dentro (valgo dinâmico).',
        alvo: 'Iniciante/Intermediário'
    },
    'Agachamento Frente (Front Squat) - Image.png': {
        desc: 'Variação com a barra à frente, focando mais em quadríceps e core.',
        exec: 'Apoie a barra nos deltoides frontais, cotovelos altos. Agache mantendo o tronco vertical.',
        dica: 'Requer boa mobilidade de punho e tornozelo.',
        rec: 'Mantenha os cotovelos apontando para frente durante todo o movimento.',
        alvo: 'Avançado'
    },
    'Agachamento Livre (Air Squat) - Image.png': {
        desc: 'O movimento fundamental de agachar usando apenas o peso do corpo.',
        exec: 'Pés na largura dos ombros, agache jogando o quadril para trás e para baixo.',
        dica: 'Mantenha os calcanhares no chão.',
        rec: 'Ótimo para aquecimento e aprendizado do movimento.',
        alvo: 'Iniciante'
    },
    'Agachamento Livre (Back Squat) - Image.png': {
        desc: 'O rei dos exercícios de perna, com barra nas costas.',
        exec: 'Barra no trapézio, agache até quebrar a paralela (quadril abaixo do joelho).',
        dica: 'Respire fundo e trave o abdômen antes de descer (Bracing).',
        rec: 'Mantenha a coluna neutra.',
        alvo: 'Intermediário/Avançado'
    },
    'Agachamento Pistol (Unilateral) - Image.png': {
        desc: 'Agachamento em uma perna só, exigindo força extrema e equilíbrio.',
        exec: 'Estenda uma perna à frente e agache completamente com a outra.',
        dica: 'Use um apoio ou TRX se for iniciante neste movimento.',
        rec: 'Cuidado com o joelho, requer muita estabilidade.',
        alvo: 'Avançado'
    },
    'Agachamento Vazio (Squat to Reach) - Image.png': {
        desc: 'Movimento de mobilidade torácica e quadril.',
        exec: 'Agache profundamente e rotacione o tronco elevando um braço para o teto.',
        dica: 'Sinta o alongamento nas costas e virilha.',
        rec: 'Faça como aquecimento.',
        alvo: 'Todos'
    },
    'Alongamento de Adutores (Borboleta) - Image.png': {
        desc: 'Alongamento para a parte interna das coxas.',
        exec: 'Sentado, junte as solas dos pés e deixe os joelhos caírem para os lados.',
        dica: 'Pressione levemente os joelhos para baixo com os cotovelos.',
        rec: 'Mantenha a coluna reta.',
        alvo: 'Todos'
    },
    'Alongamento de BícepsBraço (Extensão) -Image.png': {
        desc: 'Alongamento para bíceps e antebraço.',
        exec: 'Estenda o braço à frente com a palma para cima e puxe os dedos para baixo.',
        dica: 'Não force excessivamente o cotovelo.',
        rec: 'Segure por 20-30 segundos.',
        alvo: 'Todos'
    },
    'Alongamento de Cadeia Posterior (Tocar os Pés) - Image.png': {
        desc: 'Alongamento clássico para isquiotibiais e lombar.',
        exec: 'Em pé ou sentado, tente alcançar os pés com as mãos.',
        dica: 'Se não alcançar os pés, vá até onde conseguir sem dobrar os joelhos.',
        rec: 'Relaxe o pescoço.',
        alvo: 'Todos'
    },
    'Alongamento de Cobra (Para Lombar) - Image.png': {
        desc: 'Posição de yoga para extensão da coluna e abdominal.',
        exec: 'Deitado de bruços, empurre o chão com as mãos elevando o tronco.',
        dica: 'Olhe para cima e relaxe os glúteos.',
        rec: 'Se sentir pinçar a lombar, diminua a amplitude.',
        alvo: 'Todos'
    },
    'Alongamento de Dorsal (Segurando em Algo) - Image.png': {
        desc: 'Alongamento para a lateral das costas (latíssimo).',
        exec: 'Segure em um pilar ou batente e incline o corpo para trás lateralmente.',
        dica: 'Sinta alongar desde a axila até o quadril.',
        rec: 'Mantenha os pés fixos.',
        alvo: 'Todos'
    },
    'Alongamento de Glúteos (Figura 4 Sentado) - Image.png': {
        desc: 'Alivia tensão no quadril e glúteos.',
        exec: 'Sentado, cruze uma perna sobre a outra formando um "4" e incline o tronco.',
        dica: 'Quanto mais inclinar, maior o alongamento.',
        rec: 'Ótimo para quem trabalha sentado.',
        alvo: 'Todos'
    },
    'Alongamento de Isquiotibiais Sentado - Image.png': {
        desc: 'Foco na parte posterior da coxa.',
        exec: 'Sentado com uma perna estendida, incline-se em direção ao pé.',
        dica: 'Mantenha o pé fletido (dedos para cima).',
        rec: 'Respire fundo para relaxar o músculo.',
        alvo: 'Todos'
    },
    'Alongamento de Ombros (Puxar Braço Sobre Peito) - Image.png': {
        desc: 'Soltura para deltoides posteriores.',
        exec: 'Cruze um braço sobre o peito e pressione com o outro braço.',
        dica: 'Mantenha o ombro abaixado, longe da orelha.',
        rec: 'Segure por 15-20 segundos cada lado.',
        alvo: 'Todos'
    },
    'Alongamento de Panturrilha na Parede - Image.png': {
        desc: 'Essencial para evitar encurtamento do tríceps sural.',
        exec: 'Apoie a ponta do pé na parede e aproxime o corpo.',
        dica: 'Mantenha o calcanhar no chão.',
        rec: 'Faça após corridas ou treinos de perna.',
        alvo: 'Todos'
    },
    'Alongamento de Peitoral na Porta - Image.png': {
        desc: 'Abre o peito e melhora postura.',
        exec: 'Apoie o antebraço no batente da porta e gire o corpo para o lado oposto.',
        dica: 'Não gire a coluna, foque no ombro/peito.',
        rec: 'Faça bilateralmente.',
        alvo: 'Todos'
    },
    'Alongamento de PsoasQuadril (Afundo Alongado) - Image.png': {
        desc: 'Importante para flexores de quadril encurtados.',
        exec: 'Em posição de afundo, empurre o quadril para frente e para baixo.',
        dica: 'Contraia o glúteo da perna de trás.',
        rec: 'Mantenha o tronco ereto.',
        alvo: 'Todos'
    },
    'Alongamento de Quadríceps (Em Pé) - Image.png': {
        desc: 'Alongamento tradicional da coxa anterior.',
        exec: 'Em pé, segure o pé atrás e puxe o calcanhar em direção ao glúteo.',
        dica: 'Mantenha os joelhos alinhados, um ao lado do outro.',
        rec: 'Use uma parede para equilíbrio se necessário.',
        alvo: 'Todos'
    },
    'Alongamento de TrapézioPescoço (Lateral) - Image.png': {
        desc: 'Alívio de tensão cervical.',
        exec: 'Puxe suavemente a cabeça para o lado em direção ao ombro.',
        dica: 'Deixe o ombro oposto bem relaxado/caído.',
        rec: 'Não faça força excessiva.',
        alvo: 'Todos'
    },
    'Alongamento de Tríceps (Braço Sobre a Cabeça) - Image.png': {
        desc: 'Alongamento para a parte posterior do braço.',
        exec: 'Leve a mão às costas e empurre o cotovelo para baixo suavemente.',
        dica: 'Mantenha a cabeça ereta, não deixe o braço empurrá-la.',
        rec: 'Segure por 20s.',
        alvo: 'Todos'
    },
    'Barra Fixa (Chin-Up - Pegada Supinada) - Image.png': {
        desc: 'Barra fixa com palmas para você, foca em dorsais e bíceps.',
        exec: 'Pendure-se e puxe o corpo até o queixo passar da barra.',
        dica: 'Estenda totalmente os braços na descida.',
        rec: 'Use elástico de assistência se não conseguir subir.',
        alvo: 'Intermediário'
    },
    'Barra Fixa (Pull-Up - Pegada Pronada) - Image.pny Frente (Puxada Alta) - Image.png': {
        desc: 'Variação clássica para alargar as costas.',
        exec: 'Mãos afastadas, palmas para frente. Puxe o peito em direção à barra.',
        dica: 'Foque em puxar com os cotovelos, não com as mãos.',
        rec: 'Evite balançar o corpo (kipping) se o foco é hipertrofia.',
        alvo: 'Avançado'
    },
    'Pulley Triângulo (Puxada Fechada) - Image.png': {
        desc: 'Foco na parte central das costas e espessura.',
        exec: 'Sentado na polia, puxe o triângulo até o peito.',
        dica: 'Estufe o peito ao puxar e alongue bem na volta.',
        rec: 'Mantenha o tronco levemente inclinado para trás.',
        alvo: 'Iniciante/Intermediário'
    },
    'Puxada Alta com Corda na Polia Alta - Image.png': {
        desc: 'Variação para dorsais com maior amplitude (Face Pull ou Puxada Estendida).',
        exec: 'Puxe a corda em direção ao rosto ou peito, abrindo os cotovelos.',
        dica: 'Foco nos deltoides posteriores e parte alta das costas.',
        rec: 'Controle o retorno do peso.',
        alvo: 'Intermediário'
    },
    'Puxada de Braços com Banda (Simulando Pulley) - Image.png': {
        desc: 'Exercício de costas usando elástico, ótimo para aquecimento ou casa.',
        exec: 'Prenda a banda no alto e puxe em direção ao corpo.',
        dica: 'Mantenha tensão na banda o tempo todo.',
        rec: 'Faça altas repetições.',
        alvo: 'Iniciante'
    },
    'Pássaro-Cão (Bird-Dog) -Image.png': {
        desc: 'Exercício de estabilidade de core e coordenação.',
        exec: 'Em quatro apoios, estenda braço direito e perna esquerda simultaneamente.',
        dica: 'Imagine que tem um copo de água nas costas e não pode derramar.',
        rec: 'Segure 2 segundos na posição estendida.',
        alvo: 'Iniciante/Reabilitação'
    },
    'Remada Baixa com Barra - Image.png': {
        desc: 'Exercício composto para espessura das costas.',
        exec: 'Tronco inclinado, puxe a barra em direção ao umbigo.',
        dica: 'Mantenha a coluna neutra, não arredonde as costas.',
        rec: 'Use o cinto se a carga for alta.',
        alvo: 'Avançado'
    },
    'Remada Curvada com Barra - Image.png': {
        desc: 'Um dos melhores construtores de massa para as costas.',
        exec: 'Inclina o tronco quase paralelo ao chão, puxe a barra no abdômen.',
        dica: 'Cotovelos passam rente ao corpo.',
        rec: 'Cuidado com a lombar.',
        alvo: 'Intermediário/Avançado'
    },
    'Remada Máquina com Apoio de Peito- Image.png': {
        desc: 'Remada segura isolando as costas sem sobrecarregar a lombar.',
        exec: 'Apoie o peito no pad e puxe as manoplas.',
        dica: 'Concentre-se em juntar as escápulas no final.',
        rec: 'Ajuste a altura do banco para que o apoio fique no esterno.',
        alvo: 'Iniciante'
    },
    'Remada Unilateral com Haltere - Image.png': {
        desc: 'Remada Serrote, excelente para corrigir assimetrias.',
        exec: 'Apoie mão e joelho no banco, puxe o halter com a outra mão.',
        dica: 'Puxe o halter em direção ao quadril, não ao ombro.',
        rec: 'Mantenha as costas retas.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Costas (DorsaisTorácica) - Image.png': {
        desc: 'Liberação miofascial para as costas.',
        exec: 'Role a parte superior das costas sobre o rolo.',
        dica: 'Cruze os braços para expor melhor a musculatura.',
        rec: 'Evite rolar sobre a lombar excessivamente.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Glúteos - Image.png': {
        desc: 'Alívio para tensão nos glúteos e piriforme.',
        exec: 'Sente sobre o rolo, cruze uma perna e incline para o lado do glúteo.',
        dica: 'Procure os pontos mais doloridos e segure.',
        rec: 'Respire fundo.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Isquiotibiais - Image.png': {
        desc: 'Liberação da parte posterior da coxa.',
        exec: 'Coloque o rolo sob as coxas e use as mãos para mover o corpo.',
        dica: 'Faça uma perna de cada vez para mais pressão.',
        rec: 'Role devagar.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - IT Band (Fascia Lateral) - Image.png': {
        desc: 'Liberação da banda iliotibial (lateral da coxa).',
        exec: 'Deite de lado com o rolo sob a coxa e deslize.',
        dica: 'Geralmente é doloroso, vá com calma.',
        rec: 'Não role sobre a articulação do joelho.',
        alvo: 'Corredores'
    },
    'Rolo de Espuma - Panturrilhas - Image.png': {
        desc: 'Massagem para relaxar as panturrilhas.',
        exec: 'Apoie a panturrilha no rolo, cruze a outra perna por cima.',
        dica: 'Gire o pé para pegar as laterais.',
        rec: 'Ótimo pós-corrida.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Peitoral - Image.png': {
        desc: 'Ajuda a abrir os ombros e soltar o peitoral.',
        exec: 'Deite de bruços com o rolo sob o peito/ombro e role curto.',
        dica: 'Estenda o braço para melhor efeito.',
        rec: 'Cuidado com a pressão excessiva.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Quadríceps - Image.png': {
        desc: 'Liberação da parte frontal da coxa.',
        exec: 'De bruços, apoie as coxas no rolo e mova-se com os antebraços.',
        dica: 'Mantenha o corpo em prancha.',
        rec: 'Role até perto do quadril e até perto do joelho.',
        alvo: 'Todos'
    },
    'Rosca Alternada com Halteres - Image.png': {
        desc: 'Clássico para bíceps com rotação de punho.',
        exec: 'Em pé, suba um halter de cada vez, girando a palma para cima.',
        dica: 'Mantenha os cotovelos fixos ao lado do corpo.',
        rec: 'Não balance o tronco para ajudar.',
        alvo: 'Todos'
    },
    'Rosca Concentrada - Image.png': {
        desc: 'Isolamento total do pico do bíceps.',
        exec: 'Sentado, apoie o cotovelo na parte interna da coxa e flexione o braço.',
        dica: 'Não deixe o ombro ajudar no movimento.',
        rec: 'Controle bem a descida.',
        alvo: 'Intermediário'
    },
    'Rosca Direta com Barra - Image.png': {
        desc: 'O construtor de massa para bíceps.',
        exec: 'Segure a barra com palmas para cima, flexione os cotovelos.',
        dica: 'Evite jogar os cotovelos para frente.',
        rec: 'Mantenha postura ereta.',
        alvo: 'Todos'
    },
    'Rosca Direta na Polia Baixa - Image.png': {
        desc: 'Tensão constante no bíceps durante todo o movimento.',
        exec: 'Use uma barra curta na polia baixa e faça a flexão de braços.',
        dica: 'A polia mantém a tensão mesmo quando o braço está esticado.',
        rec: 'Bom para finalizar o treino.',
        alvo: 'Iniciante'
    },
    'Rosca Scott Máquina - Image.png': {
        desc: 'Isolamento de bíceps com apoio, impedindo "roubo".',
        exec: 'Apoie os braços no banco Scott e puxe a máquina.',
        dica: 'Estenda quase tudo, mas não trave o cotovelo no final.',
        rec: 'Ajuste o banco para a axila ficar encaixada.',
        alvo: 'Iniciante/Intermediário'
    },
    'Rotação de Braços (PequenosGrandes Círculos) - Image.png': {
        desc: 'Aquecimento articular para ombros.',
        exec: 'Com braços abertos, faça círculos pequenos e vá aumentando.',
        dica: 'Faça nos dois sentidos (horário e anti-horário).',
        rec: 'Essencial antes de treinos de peito/ombro.',
        alvo: 'Todos'
    },
    'Rotação de Tronco - Image.png': {
        desc: 'Mobilidade para coluna torácica.',
        exec: 'Em pé ou sentado, gire o tronco de um lado para o outro.',
        dica: 'Mantenha o quadril fixo, gire só a cintura para cima.',
        rec: 'Movimento controlado.',
        alvo: 'Todos'
    },
    'Rotação de Tronco na Polia - Image.png': {
        desc: 'Fortalecimento do core rotacional (Woodchopper).',
        exec: 'Segure a polia lateralmente e gire o tronco levando a alça para o outro lado.',
        dica: 'Use a força do abdômen, não só dos braços.',
        rec: 'Pés giram levemente para acompanhar.',
        alvo: 'Intermediário'
    },
    'Shuffle (Deslocamento Lateral) - Image.png': {
        desc: 'Exercício cardio e de agilidade.',
        exec: 'Desloque-se lateralmente rápido sem cruzar os pés.',
        dica: 'Mantenha os joelhos semi-flexionados (base atlética).',
        rec: 'Use para elevar a frequência cardíaca.',
        alvo: 'Todos'
    },
    'Skipping Alto (Corrida Elevando Joelhos) - Image.png': {
        desc: 'Cardio intenso e aquecimento.',
        exec: 'Corra no lugar elevando bem os joelhos em direção ao peito.',
        dica: 'Coordene com os braços.',
        rec: 'Aterrisse na ponta dos pés.',
        alvo: 'Todos'
    },
    'Slam Ball (Arremesso de Medicine Ball) - Image.png': {
        desc: 'Potência e explosão para o corpo todo.',
        exec: 'Levante a bola acima da cabeça e arremesse com força no chão.',
        dica: 'Use o corpo todo, agachando ao arremessar.',
        rec: 'Cuidado com o rebote da bola.',
        alvo: 'Intermediário'
    },
    'Smith Machine - Image.png': {
        desc: 'Barra guiada, usada para agachamentos, supinos e afundos.',
        exec: 'Varia conforme o exercício, mas a barra segue um trilho fixo.',
        dica: 'Posicione os pés corretamente para compensar a falta de movimento horizontal.',
        rec: 'Mais seguro para fazer sozinho.',
        alvo: 'Todos'
    },
    'Step-Up com Halteres - Image.png': {
        desc: 'Subida no banco, simulando escada com carga.',
        exec: 'Segurando halteres, suba em um banco ou caixa com uma perna e depois desça.',
        dica: 'Faça força no calcanhar da perna que está subindo.',
        rec: 'Mantenha o tronco alto na subida.',
        alvo: 'Todos'
    },
    'Superman (Extensão de Costas) - Image.png': {
        desc: 'Fortalecimento da lombar e paravertebrais.',
        exec: 'Deitado de bruços, eleve braços e pernas simultaneamente.',
        dica: 'Segure 1-2 segundos no topo.',
        rec: 'Olhe para o chão para não forçar o pescoço.',
        alvo: 'Iniciante'
    },
    'Supino Máquina Horizontal - Image.png': {
        desc: 'Exercício guiado para peitoral.',
        exec: 'Empurre as manoplas à frente estendendo os braços.',
        dica: 'Não desencoste as costas do banco.',
        rec: 'Ótimo para iniciantes ganharem força.',
        alvo: 'Iniciante'
    },
    'Supino na Bola Suíça - Image.png': {
        desc: 'Supino com instabilidade, ativando mais o core.',
        exec: 'Apoie as costas na bola e execute o supino com halteres.',
        dica: 'Mantenha o quadril elevado em ponte.',
        rec: 'Use cargas menores que no banco.',
        alvo: 'Intermediário'
    },
    'Supino Reto com Halteres - Image.png': {
        desc: 'Construtor de peitoral com maior amplitude que a barra.',
        exec: 'Deitado, empurre os halteres para cima unindo-os no topo.',
        dica: 'Desça os halteres até a linha do peito.',
        rec: 'Mantenha os pés firmes no chão.',
        alvo: 'Todos'
    },
    'Terra Convencional (Deadlift) - Image.png': {
        desc: 'Exercício de força total (costas, pernas, glúteos).',
        exec: 'Barra no chão, pegue na largura dos ombros, levante estendendo quadril e joelhos.',
        dica: 'Mantenha a barra colada na perna durante a subida.',
        rec: 'Coluna neutra é obrigatória. Não arredonde.',
        alvo: 'Avançado'
    },
    'Terra Romeno (Stiff-Legged Deadlift) - Image.png': {
        desc: 'Foco total em posteriores de coxa e glúteos.',
        exec: 'Com joelhos semi-flexionados, incline o tronco à frente descendo a barra rente à perna.',
        dica: 'Sinta alongar atrás da coxa.',
        rec: 'Vá apenas até onde sua coluna permitir sem curvar.',
        alvo: 'Intermediário'
    },
    'Torção da Coluna Sentada -Image.png': {
        desc: 'Mobilidade e alívio lombar.',
        exec: 'Sentado, gire o tronco para um lado usando a mão no joelho oposto como alavanca.',
        dica: 'Cresça a coluna antes de girar.',
        rec: 'Faça suavemente.',
        alvo: 'Todos'
    },
    'Tríceps Banco (Dipping entre Bancos) - Image.png': {
        desc: 'Exercício de peso corporal para tríceps.',
        exec: 'Apoie as mãos num banco atrás de você, pés noutro banco ou chão. Flexione os cotovelos.',
        dica: 'Mantenha as costas rente ao banco de apoio.',
        rec: 'Cuidado se tiver dores no ombro.',
        alvo: 'Iniciante'
    },
    'Tríceps Coice (Kickback) - Image.png': {
        desc: 'Isolamento de tríceps com halter.',
        exec: 'Tronco inclinado, cotovelo alto e fixo. Estenda o braço para trás.',
        dica: 'Só o antebraço se move.',
        rec: 'Use carga leve para focar na contração.',
        alvo: 'Todos'
    },
    'Tríceps Corda na Polia Alta - Image.png': {
        desc: 'Um dos melhores para a cabeça lateral do tríceps.',
        exec: 'Puxe a corda para baixo e abra as mãos no final do movimento.',
        dica: 'Cotovelos colados nas costelas.',
        rec: 'Não suba as mãos acima da altura do peito na volta.',
        alvo: 'Todos'
    },
    'Tríceps Máquina com Corda - Image.png': {
        desc: 'Variação similar à polia, mas em máquina específica.',
        exec: 'Estenda os braços empurrando a carga.',
        dica: 'Foco total na extensão do cotovelo.',
        rec: 'Mantenha postura.',
        alvo: 'Iniciante'
    },
    'Tríceps Testa com Barra (Skull Crusher) - Image.png': {
        desc: 'Construtor de massa para tríceps.',
        exec: 'Deitado, desça a barra em direção à testa dobrando os cotovelos.',
        dica: 'Mantenha os cotovelos apontando para o teto.',
        rec: 'Peça ajuda (spotter) se for usar muita carga.',
        alvo: 'Intermediário'
    },
    'Tríceps Testa Máquina - Image.png': {
        desc: 'Versão guiada do tríceps testa.',
        exec: 'Sentado, empurre o apoio para frente/baixo.',
        dica: 'Mantenha os cotovelos fechados.',
        rec: 'Seguro para iniciantes.',
        alvo: 'Iniciante'
    },
    'Turkish Get-Up - Image.png': {
        desc: 'Exercício funcional complexo de corpo total.',
        exec: 'Levante-se do chão segurando um peso acima da cabeça o tempo todo.',
        dica: 'Requer uma sequência específica de movimentos. Aprenda sem peso primeiro.',
        rec: 'Olhe sempre para o peso.',
        alvo: 'Avançado'
    }
};

async function uploadAndSeed() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("❌ ERRO: BLOB_READ_WRITE_TOKEN não está definido no .env");
        process.exit(1);
    }

    try {
        if (!fs.existsSync(EXERCISES_DIR)) {
            console.error(`❌ Pasta não encontrada: ${EXERCISES_DIR}`);
            process.exit(1);
        }

        const files = fs.readdirSync(EXERCISES_DIR);
        console.log(`��� Encontrados ${files.length} arquivos na pasta. Iniciando processo...`);

        let successCount = 0;

        for (const file of files) {
            // Ignorar arquivos ocultos
            if (file.startsWith('.')) continue;

            // Busca dados no dicionário OU cria genérico se não achar (fallback)
            // Normaliza o nome para busca (caso haja pequenas diferenças, mas aqui tentamos match exato)
            let data = EXERCISE_DATA[file];

            if (!data) {
                // Fallback genérico caso o nome do arquivo não bata 100%
                const cleanName = file.replace(/- Image.png/g, "").replace(/\.[^/.]+$/, "").replace(/-/g, " ");
                data = {
                    desc: `Exercício para desenvolvimento físico focado em ${cleanName}.`,
                    exec: 'Execute o movimento com controle e postura adequada.',
                    dica: 'Consulte seu treinador para ajustes finos.',
                    rec: 'Mantenha a respiração constante.',
                    alvo: 'Geral'
                };
                console.log(`⚠️ Usando descrição genérica para: ${file}`);
            }

            // Nome limpo para o banco (sem "- Image.png")
            const dbName = file.replace(' - Image.png', '').replace('.png', '').replace('.jpg', '');

            const filePath = path.join(EXERCISES_DIR, file);
            const fileBuffer = fs.readFileSync(filePath);

            console.log(`⬆️ Uploading: ${dbName}...`);
            
            // 1. Upload para Vercel Blob
            // Usamos 'exercises/' como prefixo para organizar
            const blob = await put(`exercises/${file}`, fileBuffer, { 
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            // 2. Salvar no Banco
            // ON CONFLICT UPDATE garante que se rodar de novo, atualiza a descrição e imagem
            // Vamos assumir que 'name' é único ou apenas inserir
            // Para garantir update, precisaríamos de uma constraint UNIQUE no nome. 
            // Vou usar INSERT simples, se duplicar, apague a tabela antes ou adicione unique.
            // O ideal é verificar se existe antes.
            
            const check = await pool.query("SELECT id FROM exercise_library WHERE name = ", [dbName]);
            
            if (check.rows.length > 0) {
                 await pool.query(`
                    UPDATE exercise_library SET 
                        description=, recommendations=, execution_instructions=, tips=, target_audience=, image_url= 
                    WHERE id=
                `, [data.desc, data.rec, data.exec, data.dica, data.alvo, blob.url, check.rows[0].id]);
            } else {
                await pool.query(`
                    INSERT INTO exercise_library (name, description, recommendations, execution_instructions, tips, target_audience, image_url)
                    VALUES (, , , , , , )
                `, [dbName, data.desc, data.rec, data.exec, data.dica, data.alvo, blob.url]);
            }

            console.log(`✅ Processado: ${dbName}`);
            successCount++;
        }
        console.log(`��� Sucesso! ${successCount} exercícios processados.`);
    } catch (error) {
        console.error('❌ Erro fatal:', error);
    } finally {
        process.exit();
    }
}

uploadAndSeed();
