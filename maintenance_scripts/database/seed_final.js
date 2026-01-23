require('dotenv').config();
const { pool } = require('./db');

// Mapeamento: Nome do Arquivo -> URL do Blob (Já geradas)
const EXERCISE_URLS = {
    'Abdominal Bicicleta': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Abdominal%20Bicicleta%20-%20Image.png',
    'Abdominal Crunch': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Abdominal%20Crunch%20-%20Image.png',
    'Abdominal Infra (Elevação de Pernas)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Abdominal%20Infra%20%28Eleva%C3%A7%C3%A3o%20de%20Pernas%29%20-%20Image.png',
    'Abdominal na Bola Suíça': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Abdominal%20na%20Bola%20Su%C3%AD%C3%A7a%20-%20Image.png',
    'Afundo (Lunge)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Afundo%20%28Lunge%29%20-%20Image.png',
    'Afundo com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Afundo%20com%20Halteres%20-%20Image.png',
    'Agachamento Búlgaro (com Halteres)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20B%C3%BAlgaro%20%28com%20Halteres%29%20-%20Image.png',
    'Agachamento com Banda': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20com%20Banda%20-%20Image.png',
    'Agachamento Frente (Front Squat)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20Frente%20%28Front%20Squat%29%20-%20Image.png',
    'Agachamento Livre (Air Squat)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20Livre%20%28Air%20Squat%29%20-%20Image.png',
    'Agachamento Livre (Back Squat)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20Livre%20%28Back%20Squat%29%20-%20Image.png',
    'Agachamento Pistol (Unilateral)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20Pistol%20%28Unilateral%29%20-%20Image.png',
    'Agachamento Vazio (Squat to Reach)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Agachamento%20Vazio%20%28Squat%20to%20Reach%29%20-%20Image.png',
    'Alongamento de Adutores (Borboleta)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Adutores%20%28Borboleta%29%20-%20Image.png',
    'Alongamento de BícepsBraço (Extensão)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20B%C3%ADcepsBra%C3%A7o%20%28Extens%C3%A3o%29%20-Image.png',
    'Alongamento de Cadeia Posterior (Tocar os Pés)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Cadeia%20Posterior%20%28Tocar%20os%20P%C3%A9s%29%20-%20Image.png',
    'Alongamento de Cobra (Para Lombar)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Cobra%20%28Para%20Lombar%29%20-%20Image.png',
    'Alongamento de Dorsal (Segurando em Algo)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Dorsal%20%28Segurando%20em%20Algo%29%20-%20Image.png',
    'Alongamento de Glúteos (Figura 4 Sentado)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Gl%C3%BAteos%20%28Figura%204%20Sentado%29%20-%20Image.png',
    'Alongamento de Isquiotibiais Sentado': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Isquiotibiais%20Sentado%20-%20Image.png',
    'Alongamento de Ombros (Puxar Braço Sobre Peito)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Ombros%20%28Puxar%20Bra%C3%A7o%20Sobre%20Peito%29%20-%20Image.png',
    'Alongamento de Panturrilha na Parede': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Panturrilha%20na%20Parede%20-%20Image.png',
    'Alongamento de Peitoral na Porta': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Peitoral%20na%20Porta%20-%20Image.png',
    'Alongamento de PsoasQuadril (Afundo Alongado)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20PsoasQuadril%20%28Afundo%20Alongado%29%20-%20Image.png',
    'Alongamento de Quadríceps (Em Pé)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Quadr%C3%ADceps%20%28Em%20P%C3%A9%29%20-%20Image.png',
    'Alongamento de TrapézioPescoço (Lateral)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Trap%C3%A9zioPesco%C3%A7o%20%28Lateral%29%20-%20Image.png',
    'Alongamento de Tríceps (Braço Sobre a Cabeça)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Alongamento%20de%20Tr%C3%ADceps%20%28Bra%C3%A7o%20Sobre%20a%20Cabe%C3%A7a%29%20-%20Image.png',
    'Barra Fixa (Chin-Up - Pegada Supinada)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Barra%20Fixa%20%28Chin-Up%20-%20Pegada%20Supinada%29%20-%20Image.png',
    'Barra Fixa (Pull-Up - Pegada Pronada)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Barra%20Fixa%20%28Pull-Up%20-%20Pegada%20Pronada%29%20-%20Image.png',
    'Bola de Massagem - GlúteosPiriforme': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Bola%20de%20Massagem%20-%20Gl%C3%BAteosPiriforme%20-%20Image.png',
    'Bola de Massagem': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Bola%20de%20Massagem%20-%20Image.png',
    'Bola de Massagem - Peitoral (perto da Axila)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Bola%20de%20Massagem%20-%20Peitoral%20%28perto%20da%20Axila%29%20-%20Image.png',
    'Bola de Massagem - TrapézioOmbros': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Bola%20de%20Massagem%20-%20Trap%C3%A9zioOmbros%20-%20Image.png',
    'Burpee': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Burpee%20-%20Image.png',
    'Cadeira Abdutora': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Cadeira%20Abdutora%20-%20Image.png',
    'Cadeira Adutora': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Cadeira%20Adutora%20-%20Image.png',
    'Cadeira Extensora': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Cadeira%20Extensora%20-%20Image.png',
    'Caminhada com Agachamento (Spider-Man Lunge)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Caminhada%20com%20Agachamento%20%28Spider-Man%20Lunge%29%20-%20Image.png',
    'Cat-Camel (Alongamento Gato-Vaca Dinâmico)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Cat-Camel%20%28Alongamento%20Gato-Vaca%20Din%C3%A2mico%29%20-%20Image.png',
    'Chutes no Glúteo (Butt Kicks)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Chutes%20no%20Gl%C3%BAteo%20%28Butt%20Kicks%29%20-%20Image.png',
    'Clean & Press (Arranco e Desenvolvimento)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Clean%20%26%20Press%20%28Arranco%20e%20Desenvolvimento%29%20-%20Image.png',
    'Corrida Estacionária (no Lugar)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Corrida%20Estacion%C3%A1ria%20%28no%20Lugar%29%20-%20Image.png',
    'Crossover (Polia Alta)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Crossover%20%28Polia%20Alta%29%20-%20Image.png',
    'Crucifixo com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Crucifixo%20com%20Halteres%20-%20Image.png',
    'Crucifixo Invertido Máquina (Deltóide Posterior)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Crucifixo%20Invertido%20M%C3%A1quina%20%28Delt%C3%B3ide%20Posterior%29%20-%20Image.png',
    'Crucifixo Máquina (Peck-Deck)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Crucifixo%20M%C3%A1quina%20%28Peck-Deck%29%20-%20Image.png',
    'Desenvolvimento Arnold': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Desenvolvimento%20Arnold%20-%20Image.png',
    'Desenvolvimento Militar com Barra': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Desenvolvimento%20Militar%20com%20Barra%20-%20Image.png',
    'Desenvolvimento Máquina Sentado': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Desenvolvimento%20M%C3%A1quina%20Sentado%20-%20Image.png',
    'Elevação Frontal com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Eleva%C3%A7%C3%A3o%20Frontal%20com%20Halteres%20-%20Image.png',
    'Elevação Lateral com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Eleva%C3%A7%C3%A3o%20Lateral%20com%20Halteres%20-%20Image.png',
    'Elevação Lateral Máquina': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Eleva%C3%A7%C3%A3o%20Lateral%20M%C3%A1quina%20-%20Image.png',
    'Elevação Posterior (Crucifixo Invertido) com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Eleva%C3%A7%C3%A3o%20Posterior%20%28Crucifixo%20Invertido%29%20com%20Halteres%20-%20Image.png',
    'Face Pull com Banda': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Face%20Pull%20com%20Banda%20-%20Image.png',
    'Flexão de Braço (Pegada Média)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Flex%C3%A3o%20de%20Bra%C3%A7o%20%28Pegada%20M%C3%A9dia%29%20-%20Image.png',
    'Glúteo no Crossover': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Gl%C3%BAteo%20no%20Crossover%20-%20Image.png',
    'Goblet Squat': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Goblet%20Squat%20-%20Image.png',
    'Hack Machine': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Hack%20Machine%20-%20Image.png',
    'Kettlebell Swing': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Kettlebell%20Swing%20-%20Image.png',
    'Leg Press 45': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Leg%20Press%2045%20-%20Image.png',
    'Mesa Flexora': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Mesa%20Flexora%20-%20Image.png',
    'Mobilidade de Quadris (Círculos com Joelho)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Mobilidade%20de%20Quadris%20%28C%C3%ADrculos%20com%20Joelho%29%20-%20Image.png',
    'Mobilidade de Tornozelos (Círculos)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Mobilidade%20de%20Tornozelos%20%28C%C3%ADrculos%29%20-Image.png',
    'Mountain Climber': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Mountain%20Climber%20-%20Image.png',
    'Máquina de Extensão de Costas (Hipersxtensão)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/M%C3%A1quina%20de%20Extens%C3%A3o%20de%20Costas%20%28Hipersxtens%C3%A3o%29%20-%20Image.png',
    'Máquina de Panturrilha em Pé': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/M%C3%A1quina%20de%20Panturrilha%20em%20P%C3%A9%20-%20Image.png',
    'Máquina de Panturrilha Sentado': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/M%C3%A1quina%20de%20Panturrilha%20Sentado%20-%20Image.png',
    'Panturrilha no Leg Press': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Panturrilha%20no%20Leg%20Press%20-%20Image.png',
    'Polichinelo (Jumping Jack)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Polichinelo%20%28Jumping%20Jack%29%20-%20Image.png',
    'Ponte de Glúteos (com Peso Corporal)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Ponte%20de%20Gl%C3%BAteos%20%28com%20Peso%20Corporal%29%20-%20Image.png',
    'Posição da Criança (Child\'s Pose)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Posi%C3%A7%C3%A3o%20da%20Crian%C3%A7a%20%28Child%27s%20Pose%29%20-Image.png',
    'Prancha com os Pés na Bola': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Prancha%20com%20os%20P%C3%A9s%20na%20Bola%20-%20Image.png',
    'Prancha com Toques nos Ombros': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Prancha%20com%20Toques%20nos%20Ombros%20-%20Image.png',
    'Prancha Frontal': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Prancha%20Frontal%20-%20Image.png',
    'Prancha Lateral': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Prancha%20Lateral%20-%20Image.png',
    'Pull-Down Máquina Assistida': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Pull-Down%20M%C3%A1quina%20Assistida%20-%20Image.png',
    'Pulley Frente (Puxada Alta)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Pulley%20Frente%20%28Puxada%20Alta%29%20-%20Image.png',
    'Pulley Triângulo (Puxada Fechada)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Pulley%20Tri%C3%A2ngulo%20%28Puxada%20Fechada%29%20-%20Image.png',
    'Puxada Alta com Corda na Polia Alta': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Puxada%20Alta%20com%20Corda%20na%20Polia%20Alta%20-%20Image.png',
    'Puxada de Braços com Banda (Simulando Pulley)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Puxada%20de%20Bra%C3%A7os%20com%20Banda%20%28Simulando%20Pulley%29%20-%20Image.png',
    'Pássaro-Cão (Bird-Dog)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/P%C3%A1ssaro-C%C3%A3o%20%28Bird-Dog%29%20-Image.png',
    'Remada Baixa com Barra': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Remada%20Baixa%20com%20Barra%20-%20Image.png',
    'Remada Curvada com Barra': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Remada%20Curvada%20com%20Barra%20-%20Image.png',
    'Remada Máquina com Apoio de Peito': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Remada%20M%C3%A1quina%20com%20Apoio%20de%20Peito-%20Image.png',
    'Remada Unilateral com Haltere': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Remada%20Unilateral%20com%20Haltere%20-%20Image.png',
    'Rolo de Espuma - Costas (DorsaisTorácica)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Costas%20%28DorsaisTor%C3%A1cica%29%20-%20Image.png',
    'Rolo de Espuma - Glúteos': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Gl%C3%BAteos%20-%20Image.png',
    'Rolo de Espuma - Isquiotibiais': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Isquiotibiais%20-%20Image.png',
    'Rolo de Espuma - IT Band (Fascia Lateral)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20IT%20Band%20%28Fascia%20Lateral%29%20-%20Image.png',
    'Rolo de Espuma - Panturrilhas': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Panturrilhas%20-%20Image.png',
    'Rolo de Espuma - Peitoral': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Peitoral%20-%20Image.png',
    'Rolo de Espuma - Quadríceps': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rolo%20de%20Espuma%20-%20Quadr%C3%ADceps%20-%20Image.png',
    'Rosca Alternada com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rosca%20Alternada%20com%20Halteres%20-%20Image.png',
    'Rosca Concentrada': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rosca%20Concentrada%20-%20Image.png',
    'Rosca Direta com Barra': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rosca%20Direta%20com%20Barra%20-%20Image.png',
    'Rosca Direta na Polia Baixa': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rosca%20Direta%20na%20Polia%20Baixa%20-%20Image.png',
    'Rosca Scott Máquina': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rosca%20Scott%20M%C3%A1quina%20-%20Image.png',
    'Rotação de Braços (PequenosGrandes Círculos)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rota%C3%A7%C3%A3o%20de%20Bra%C3%A7os%20%28PequenosGrandes%20C%C3%ADrculos%29%20-%20Image.png',
    'Rotação de Tronco': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rota%C3%A7%C3%A3o%20de%20Tronco%20-%20Image.png',
    'Rotação de Tronco na Polia': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Rota%C3%A7%C3%A3o%20de%20Tronco%20na%20Polia%20-%20Image.png',
    'Shuffle (Deslocamento Lateral)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Shuffle%20%28Deslocamento%20Lateral%29%20-%20Image.png',
    'Skipping Alto (Corrida Elevando Joelhos)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Skipping%20Alto%20%28Corrida%20Elevando%20Joelhos%29%20-%20Image.png',
    'Slam Ball (Arremesso de Medicine Ball)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Slam%20Ball%20%28Arremesso%20de%20Medicine%20Ball%29%20-%20Image.png',
    'Smith Machine': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Smith%20Machine%20-%20Image.png',
    'Step-Up com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Step-Up%20com%20Halteres%20-%20Image.png',
    'Superman (Extensão de Costas)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Superman%20%28Extens%C3%A3o%20de%20Costas%29%20-%20Image.png',
    'Supino Máquina Horizontal': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Supino%20M%C3%A1quina%20Horizontal%20-%20Image.png',
    'Supino na Bola Suíça': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Supino%20na%20Bola%20Su%C3%AD%C3%A7a%20-%20Image.png',
    'Supino Reto com Halteres': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Supino%20Reto%20com%20Halteres%20-%20Image.png',
    'Terra Convencional (Deadlift)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Terra%20Convencional%20%28Deadlift%29%20-%20Image.png',
    'Terra Romeno (Stiff-Legged Deadlift)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Terra%20Romeno%20%28Stiff-Legged%20Deadlift%29%20-%20Image.png',
    'Torção da Coluna Sentada': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tor%C3%A7%C3%A3o%20da%20Coluna%20Sentada%20-Image.png',
    'Tríceps Banco (Dipping entre Bancos)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20Banco%20%28Dipping%20entre%20Bancos%29%20-%20Image.png',
    'Tríceps Coice (Kickback)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20Coice%20%28Kickback%29%20-%20Image.png',
    'Tríceps Corda na Polia Alta': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20Corda%20na%20Polia%20Alta%20-%20Image.png',
    'Tríceps Máquina com Corda': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20M%C3%A1quina%20com%20Corda%20-%20Image.png',
    'Tríceps Testa com Barra (Skull Crusher)': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20Testa%20com%20Barra%20%28Skull%20Crusher%29%20-%20Image.png',
    'Tríceps Testa Máquina': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Tr%C3%ADceps%20Testa%20M%C3%A1quina%20-%20Image.png',
    'Turkish Get-Up': 'https://h0keylbkus7gv7pa.public.blob.vercel-storage.com/assets/Turkish%20Get-Up%20-%20Image.png'
};

const EXERCISE_DATA = {
    'Abdominal Bicicleta': {
        desc: 'Exercício abdominal dinâmico que foca nos músculos oblíquos e reto abdominal.',
        exec: 'Deite-se de costas, mãos atrás da cabeça. Traga o joelho direito em direção ao cotovelo esquerdo enquanto estende a perna esquerda. Alterne os lados.',
        dica: 'Mantenha a lombar apoiada no chão e não force o pescoço.',
        rec: 'Realize movimentos controlados, sem pressa.',
        alvo: 'Intermediário/Avançado'
    },
    'Abdominal Crunch': {
        desc: 'O movimento clássico para fortalecimento do reto abdominal superior.',
        exec: 'Deitado, joelhos flexionados, eleve apenas as omoplatas do chão contraindo o abdômen.',
        dica: 'Solte o ar ao subir e inspire ao descer.',
        rec: 'Não puxe a cabeça com as mãos; a força deve vir do abdômen.',
        alvo: 'Iniciante'
    },
    'Abdominal Infra (Elevação de Pernas)': {
        desc: 'Focado na porção inferior do abdômen.',
        exec: 'Deitado, eleve as pernas estendidas ou semi-flexionadas até formar 90 graus, depois desça devagar.',
        dica: 'Coloque as mãos sob os glúteos para proteger a lombar.',
        rec: 'Evite tirar a lombar do chão durante a descida.',
        alvo: 'Intermediário'
    },
    'Abdominal na Bola Suíça': {
        desc: 'Crunch realizado sobre a bola para maior amplitude e instabilidade.',
        exec: 'Apoie a lombar na bola, pés firmes no chão. Faça o movimento de crunch.',
        dica: 'A bola exige mais equilíbrio, ativando o core profundo.',
        rec: 'Olhe para um ponto fixo no teto.',
        alvo: 'Intermediário'
    },
    'Afundo (Lunge)': {
        desc: 'Exercício unilateral poderoso para pernas e glúteos.',
        exec: 'Dê um passo à frente e flexione ambos os joelhos até 90 graus. Retorne à posição inicial.',
        dica: 'Mantenha o tronco ereto e o core ativado.',
        rec: 'O joelho da frente não deve ultrapassar muito a ponta do pé.',
        alvo: 'Todos'
    },
    'Afundo com Halteres': {
        desc: 'Variação do afundo com carga extra para maior hipertrofia.',
        exec: 'Segure um halter em cada mão com os braços estendidos ao lado do corpo e execute o afundo.',
        dica: 'Mantenha os ombros para trás e peito aberto.',
        rec: 'Use uma carga que permita manter o equilíbrio.',
        alvo: 'Intermediário'
    },
    'Agachamento Búlgaro (com Halteres)': {
        desc: 'Agachamento unilateral com o pé de trás apoiado, excelente para glúteos.',
        exec: 'Apoie o peito do pé de trás num banco. Agache com a perna da frente.',
        dica: 'Incline levemente o tronco à frente para focar mais no glúteo.',
        rec: 'Concentre a força no calcanhar da perna da frente.',
        alvo: 'Avançado'
    },
    'Agachamento com Banda': {
        desc: 'Agachamento com resistência elástica para ativar glúteo médio.',
        exec: 'Coloque a mini-band acima dos joelhos e agache mantendo a tensão.',
        dica: 'Force os joelhos para fora contra a banda.',
        rec: 'Não deixe os joelhos caírem para dentro (valgo dinâmico).',
        alvo: 'Iniciante/Intermediário'
    },
    'Agachamento Frente (Front Squat)': {
        desc: 'Variação com a barra à frente, focando mais em quadríceps e core.',
        exec: 'Apoie a barra nos deltoides frontais, cotovelos altos. Agache mantendo o tronco vertical.',
        dica: 'Requer boa mobilidade de punho e tornozelo.',
        rec: 'Mantenha os cotovelos apontando para frente durante todo o movimento.',
        alvo: 'Avançado'
    },
    'Agachamento Livre (Air Squat)': {
        desc: 'O movimento fundamental de agachar usando apenas o peso do corpo.',
        exec: 'Pés na largura dos ombros, agache jogando o quadril para trás e para baixo.',
        dica: 'Mantenha os calcanhares no chão.',
        rec: 'Ótimo para aquecimento e aprendizado do movimento.',
        alvo: 'Iniciante'
    },
    'Agachamento Livre (Back Squat)': {
        desc: 'O rei dos exercícios de perna, com barra nas costas.',
        exec: 'Barra no trapézio, agache até quebrar a paralela (quadril abaixo do joelho).',
        dica: 'Respire fundo e trave o abdômen antes de descer (Bracing).',
        rec: 'Mantenha a coluna neutra.',
        alvo: 'Intermediário/Avançado'
    },
    'Agachamento Pistol (Unilateral)': {
        desc: 'Agachamento em uma perna só, exigindo força extrema e equilíbrio.',
        exec: 'Estenda uma perna à frente e agache completamente com a outra.',
        dica: 'Use um apoio ou TRX se for iniciante neste movimento.',
        rec: 'Cuidado com o joelho, requer muita estabilidade.',
        alvo: 'Avançado'
    },
    'Agachamento Vazio (Squat to Reach)': {
        desc: 'Movimento de mobilidade torácica e quadril.',
        exec: 'Agache profundamente e rotacione o tronco elevando um braço para o teto.',
        dica: 'Sinta o alongamento nas costas e virilha.',
        rec: 'Faça como aquecimento.',
        alvo: 'Todos'
    },
    'Alongamento de Adutores (Borboleta)': {
        desc: 'Alongamento para a parte interna das coxas.',
        exec: 'Sentado, junte as solas dos pés e deixe os joelhos caírem para os lados.',
        dica: 'Pressione levemente os joelhos para baixo com os cotovelos.',
        rec: 'Mantenha a coluna reta.',
        alvo: 'Todos'
    },
    'Alongamento de BícepsBraço (Extensão)': {
        desc: 'Alongamento para bíceps e antebraço.',
        exec: 'Estenda o braço à frente com a palma para cima e puxe os dedos para baixo.',
        dica: 'Não force excessivamente o cotovelo.',
        rec: 'Segure por 20-30 segundos.',
        alvo: 'Todos'
    },
    'Alongamento de Cadeia Posterior (Tocar os Pés)': {
        desc: 'Alongamento clássico para isquiotibiais e lombar.',
        exec: 'Em pé ou sentado, tente alcançar os pés com as mãos.',
        dica: 'Se não alcançar os pés, vá até onde conseguir sem dobrar os joelhos.',
        rec: 'Relaxe o pescoço.',
        alvo: 'Todos'
    },
    'Alongamento de Cobra (Para Lombar)': {
        desc: 'Posição de yoga para extensão da coluna e abdominal.',
        exec: 'Deitado de bruços, empurre o chão com as mãos elevando o tronco.',
        dica: 'Olhe para cima e relaxe os glúteos.',
        rec: 'Se sentir pinçar a lombar, diminua a amplitude.',
        alvo: 'Todos'
    },
    'Alongamento de Dorsal (Segurando em Algo)': {
        desc: 'Alongamento para a lateral das costas (latíssimo).',
        exec: 'Segure em um pilar ou batente e incline o corpo para trás lateralmente.',
        dica: 'Sinta alongar desde a axila até o quadril.',
        rec: 'Mantenha os pés fixos.',
        alvo: 'Todos'
    },
    'Alongamento de Glúteos (Figura 4 Sentado)': {
        desc: 'Alivia tensão no quadril e glúteos.',
        exec: 'Sentado, cruze uma perna sobre a outra formando um "4" e incline o tronco.',
        dica: 'Quanto mais inclinar, maior o alongamento.',
        rec: 'Ótimo para quem trabalha sentado.',
        alvo: 'Todos'
    },
    'Alongamento de Isquiotibiais Sentado': {
        desc: 'Foco na parte posterior da coxa.',
        exec: 'Sentado com uma perna estendida, incline-se em direção ao pé.',
        dica: 'Mantenha o pé fletido (dedos para cima).',
        rec: 'Respire fundo para relaxar o músculo.',
        alvo: 'Todos'
    },
    'Alongamento de Ombros (Puxar Braço Sobre Peito)': {
        desc: 'Soltura para deltoides posteriores.',
        exec: 'Cruze um braço sobre o peito e pressione com o outro braço.',
        dica: 'Mantenha o ombro abaixado, longe da orelha.',
        rec: 'Segure por 15-20 segundos cada lado.',
        alvo: 'Todos'
    },
    'Alongamento de Panturrilha na Parede': {
        desc: 'Essencial para evitar encurtamento do tríceps sural.',
        exec: 'Apoie a ponta do pé na parede e aproxime o corpo.',
        dica: 'Mantenha o calcanhar no chão.',
        rec: 'Faça após corridas ou treinos de perna.',
        alvo: 'Todos'
    },
    'Alongamento de Peitoral na Porta': {
        desc: 'Abre o peito e melhora postura.',
        exec: 'Apoie o antebraço no batente da porta e gire o corpo para o lado oposto.',
        dica: 'Não gire a coluna, foque no ombro/peito.',
        rec: 'Faça bilateralmente.',
        alvo: 'Todos'
    },
    'Alongamento de PsoasQuadril (Afundo Alongado)': {
        desc: 'Importante para flexores de quadril encurtados.',
        exec: 'Em posição de afundo, empurre o quadril para frente e para baixo.',
        dica: 'Contraia o glúteo da perna de trás.',
        rec: 'Mantenha o tronco ereto.',
        alvo: 'Todos'
    },
    'Alongamento de Quadríceps (Em Pé)': {
        desc: 'Alongamento tradicional da coxa anterior.',
        exec: 'Em pé, segure o pé atrás e puxe o calcanhar em direção ao glúteo.',
        dica: 'Mantenha os joelhos alinhados, um ao lado do outro.',
        rec: 'Use uma parede para equilíbrio se necessário.',
        alvo: 'Todos'
    },
    'Alongamento de TrapézioPescoço (Lateral)': {
        desc: 'Alívio de tensão cervical.',
        exec: 'Puxe suavemente a cabeça para o lado em direção ao ombro.',
        dica: 'Deixe o ombro oposto bem relaxado/caído.',
        rec: 'Não faça força excessiva.',
        alvo: 'Todos'
    },
    'Alongamento de Tríceps (Braço Sobre a Cabeça)': {
        desc: 'Alongamento para a parte posterior do braço.',
        exec: 'Leve a mão às costas e empurre o cotovelo para baixo suavemente.',
        dica: 'Mantenha a cabeça ereta, não deixe o braço empurrá-la.',
        rec: 'Segure por 20s.',
        alvo: 'Todos'
    },
    'Barra Fixa (Chin-Up - Pegada Supinada)': {
        desc: 'Barra fixa com palmas para você, foca em dorsais e bíceps.',
        exec: 'Pendure-se e puxe o corpo até o queixo passar da barra.',
        dica: 'Estenda totalmente os braços na descida.',
        rec: 'Use elástico de assistência se não conseguir subir.',
        alvo: 'Intermediário'
    },
    'Barra Fixa (Pull-Up - Pegada Pronada)': {
        desc: 'Variação clássica para alargar as costas.',
        exec: 'Mãos afastadas, palmas para frente. Puxe o peito em direção à barra.',
        dica: 'Foque em puxar com os cotovelos, não com as mãos.',
        rec: 'Evite balançar o corpo (kipping) se o foco é hipertrofia.',
        alvo: 'Avançado'
    },
    'Bola de Massagem - GlúteosPiriforme': {
        desc: 'Alivia tensão no quadril e glúteos.',
        exec: 'Sente sobre a bola e massageie o ponto de dor.',
        dica: 'Use o peso do corpo para controlar a pressão.',
        rec: 'Respire fundo.',
        alvo: 'Todos'
    },
    'Bola de Massagem': {
        desc: 'Acessório para liberação miofascial.',
        exec: 'Use a bola para massagear pontos gatilho.',
        dica: 'Comece devagar.',
        rec: 'Evite ossos.',
        alvo: 'Todos'
    },
    'Bola de Massagem - Peitoral (perto da Axila)': {
        desc: 'Libera tensão no peitoral menor.',
        exec: 'Pressione a bola contra a parede usando o peito.',
        dica: 'Role suavemente.',
        rec: 'Ótimo para quem fica muito no computador.',
        alvo: 'Todos'
    },
    'Bola de Massagem - TrapézioOmbros': {
        desc: 'Alivia tensão nos ombros.',
        exec: 'Pressione a bola contra a parede usando as costas.',
        dica: 'Encontre o ponto dolorido e segure.',
        rec: 'Relaxe o braço.',
        alvo: 'Todos'
    },
    'Burpee': {
        desc: 'Exercício metabólico de corpo inteiro.',
        exec: 'Agache, vá para prancha, faça uma flexão, volte e salte.',
        dica: 'Mantenha o core firme na prancha.',
        rec: 'Comece devagar se for iniciante.',
        alvo: 'Intermediário'
    },
    'Cadeira Abdutora': {
        desc: 'Foco no glúteo médio e lateral do quadril.',
        exec: 'Sente-se e afaste as pernas contra a resistência.',
        dica: 'Não balance o tronco.',
        rec: 'Segure 1s na abertura.',
        alvo: 'Iniciante'
    },
    'Cadeira Adutora': {
        desc: 'Foco nos músculos internos da coxa.',
        exec: 'Sente-se e feche as pernas contra a resistência.',
        dica: 'Controle a volta.',
        rec: 'Ajuste a amplitude para não sentir dor.',
        alvo: 'Iniciante'
    },
    'Cadeira Extensora': {
        desc: 'Isolamento de quadríceps.',
        exec: 'Estenda os joelhos até as pernas ficarem retas.',
        dica: 'Não tire o quadril do banco.',
        rec: 'Segure no topo por 1 segundo.',
        alvo: 'Iniciante'
    },
    'Caminhada com Agachamento (Spider-Man Lunge)': {
        desc: 'Mobilidade dinâmica de quadril.',
        exec: 'Dê um grande passo à frente e baixe o quadril.',
        dica: 'Mantenha a perna de trás esticada.',
        rec: 'Ótimo aquecimento.',
        alvo: 'Intermediário'
    },
    'Cat-Camel (Alongamento Gato-Vaca Dinâmico)': {
        desc: 'Mobilidade de coluna.',
        exec: 'Em 4 apoios, arqueie a coluna para cima e depois para baixo.',
        dica: 'Sincronize com a respiração.',
        rec: 'Faça movimentos fluidos.',
        alvo: 'Todos'
    },
    'Chutes no Glúteo (Butt Kicks)': {
        desc: 'Aquecimento dinâmico.',
        exec: 'Corra no lugar tentando tocar o calcanhar no glúteo.',
        dica: 'Mantenha o tronco ereto.',
        rec: 'Aumente a velocidade gradualmente.',
        alvo: 'Todos'
    },
    'Clean & Press (Arranco e Desenvolvimento)': {
        desc: 'Exercício de potência total.',
        exec: 'Tire o peso do chão até os ombros e empurre para cima.',
        dica: 'Use a força do quadril.',
        rec: 'Cuidado com a técnica.',
        alvo: 'Avançado'
    },
    'Corrida Estacionária (no Lugar)': {
        desc: 'Cardio simples.',
        exec: 'Simule uma corrida sem sair do lugar.',
        dica: 'Use os braços.',
        rec: 'Mantenha o ritmo.',
        alvo: 'Todos'
    },
    'Crossover (Polia Alta)': {
        desc: 'Isolamento de peitoral.',
        exec: 'Puxe as polias em direção ao centro do corpo.',
        dica: 'Cotovelos levemente flexionados.',
        rec: 'Sinta o peitoral contrair.',
        alvo: 'Intermediário'
    },
    'Crucifixo com Halteres': {
        desc: 'Isolamento de peitoral com pesos livres.',
        exec: 'Deitado, abra os braços e feche no topo.',
        dica: 'Imagine que está abraçando uma árvore.',
        rec: 'Não desça demais para não forçar o ombro.',
        alvo: 'Intermediário'
    },
    'Crucifixo Invertido Máquina (Deltóide Posterior)': {
        desc: 'Foco na parte de trás do ombro.',
        exec: 'Sente-se de frente para a máquina e abra os braços para trás.',
        dica: 'Cotovelos na altura dos ombros.',
        rec: 'Não use impulso.',
        alvo: 'Iniciante'
    },
    'Crucifixo Máquina (Peck-Deck)': {
        desc: 'Isolamento de peitoral em máquina.',
        exec: 'Feche os braços à frente do corpo.',
        dica: 'Mantenha os cotovelos alinhados.',
        rec: 'Foco na contração.',
        alvo: 'Iniciante'
    },
    'Desenvolvimento Arnold': {
        desc: 'Variação de ombro com rotação.',
        exec: 'Comece com palmas para você, gire ao subir.',
        dica: 'Movimento completo.',
        rec: 'Comece leve.',
        alvo: 'Intermediário'
    },
    'Desenvolvimento Militar com Barra': {
        desc: 'Força bruta de ombros.',
        exec: 'Empurre a barra da clavícula para cima da cabeça.',
        dica: 'Contraia glúteos e abdômen.',
        rec: 'Não incline as costas para trás.',
        alvo: 'Intermediário'
    },
    'Desenvolvimento Máquina Sentado': {
        desc: 'Ombros com segurança.',
        exec: 'Empurre as manoplas para cima.',
        dica: 'Não trave os cotovelos no topo.',
        rec: 'Mantenha a lombar apoiada.',
        alvo: 'Iniciante'
    },
    'Elevação Frontal com Halteres': {
        desc: 'Foco na parte da frente do ombro.',
        exec: 'Levante o peso à frente até a altura do ombro.',
        dica: 'Não balance o corpo.',
        rec: 'Desça devagar.',
        alvo: 'Iniciante'
    },
    'Elevação Lateral com Halteres': {
        desc: 'Alarga os ombros (deltóide medial).',
        exec: 'Levante os braços lateralmente até a altura dos ombros.',
        dica: 'Cotovelos levemente flexionados.',
        rec: 'Imagine que está servindo jarras de água.',
        alvo: 'Iniciante'
    },
    'Elevação Lateral Máquina': {
        desc: 'Deltóide lateral com tensão constante.',
        exec: 'Levante os cotovelos contra o apoio.',
        dica: 'Relaxe as mãos.',
        rec: 'Foco no ombro.',
        alvo: 'Iniciante'
    },
    'Elevação Posterior (Crucifixo Invertido) com Halteres': {
        desc: 'Postura e ombro posterior.',
        exec: 'Incline o tronco e abra os braços lateralmente.',
        dica: 'Junte as escápulas.',
        rec: 'Mantenha a coluna reta.',
        alvo: 'Intermediário'
    },
    'Face Pull com Banda': {
        desc: 'Saúde dos ombros e postura.',
        exec: 'Puxe a banda em direção ao rosto, abrindo as mãos.',
        dica: 'Cotovelos altos.',
        rec: 'Segure 1s no final.',
        alvo: 'Todos'
    },
    'Flexão de Braço (Pegada Média)': {
        desc: 'Clássico para peito e tríceps.',
        exec: 'Apoie mãos e pés no chão, desça e suba o corpo.',
        dica: 'Corpo em prancha.',
        rec: 'Use os joelhos se for difícil.',
        alvo: 'Todos'
    },
    'Glúteo no Crossover': {
        desc: 'Extensão de quadril na polia.',
        exec: 'Prenda o tornozelo e chute para trás.',
        dica: 'Contraia o glúteo no topo.',
        rec: 'Não arqueie a lombar.',
        alvo: 'Intermediário'
    },
    'Goblet Squat': {
        desc: 'Agachamento segurando peso no peito.',
        exec: 'Segure o halter/kettlebell no peito e agache.',
        dica: 'Cotovelos entre os joelhos.',
        rec: 'Mantenha o peito aberto.',
        alvo: 'Iniciante'
    },
    'Hack Machine': {
        desc: 'Agachamento guiado com apoio nas costas.',
        exec: 'Agache na máquina até 90 graus.',
        dica: 'Não tire a lombar do encosto.',
        rec: 'Empurre com os calcanhares.',
        alvo: 'Iniciante'
    },
    'Kettlebell Swing': {
        desc: 'Potência de quadril e cardio.',
        exec: 'Balance o peso usando a força do quadril, não dos braços.',
        dica: 'Explosão no quadril.',
        rec: 'Coluna neutra.',
        alvo: 'Intermediário'
    },
    'Leg Press 45': {
        desc: 'Força de pernas com segurança.',
        exec: 'Empurre a plataforma e flexione os joelhos.',
        dica: 'Não estenda totalmente os joelhos.',
        rec: 'Pés na largura do quadril.',
        alvo: 'Todos'
    },
    'Mesa Flexora': {
        desc: 'Isolamento de posteriores da coxa.',
        exec: 'Deitado, flexione os joelhos trazendo o apoio ao glúteo.',
        dica: 'Não levante o quadril da mesa.',
        rec: 'Controle a descida.',
        alvo: 'Iniciante'
    },
    'Mobilidade de Quadris (Círculos com Joelho)': {
        desc: 'Soltura da articulação do quadril.',
        exec: 'Em 4 apoios, faça círculos grandes com o joelho.',
        dica: 'Movimento amplo.',
        rec: 'Faça os dois sentidos.',
        alvo: 'Todos'
    },
    'Mobilidade de Tornozelos (Círculos)': {
        desc: 'Preparo para agachamentos e corridas.',
        exec: 'Gire o tornozelo em círculos.',
        dica: 'Use a amplitude máxima.',
        rec: 'Faça antes do treino.',
        alvo: 'Todos'
    },
    'Mountain Climber': {
        desc: 'Cardio e core.',
        exec: 'Em prancha, traga os joelhos alternados ao peito rápido.',
        dica: 'Quadril baixo.',
        rec: 'Mantenha o ritmo.',
        alvo: 'Intermediário'
    },
    'Máquina de Extensão de Costas (Hipersxtensão)': {
        desc: 'Lombar e glúteos.',
        exec: 'Desça o tronco e suba até alinhar.',
        dica: 'Não hiperextenda demais.',
        rec: 'Contraia glúteos na subida.',
        alvo: 'Iniciante'
    },
    'Máquina de Panturrilha em Pé': {
        desc: 'Panturrilha completa.',
        exec: 'Fique na ponta dos pés e desça o máximo possível.',
        dica: 'Joelhos estendidos mas não travados.',
        rec: 'Amplitude total.',
        alvo: 'Todos'
    },
    'Máquina de Panturrilha Sentado': {
        desc: 'Foco no músculo sóleo.',
        exec: 'Eleve os calcanhares sentado.',
        dica: 'Movimento lento.',
        rec: 'Segure no topo.',
        alvo: 'Todos'
    },
    'Panturrilha no Leg Press': {
        desc: 'Panturrilha com carga alta.',
        exec: 'Empurre a plataforma com a ponta dos pés.',
        dica: 'Cuidado para o pé não escorregar.',
        rec: 'Segurança em primeiro lugar.',
        alvo: 'Intermediário'
    },
    'Polichinelo (Jumping Jack)': {
        desc: 'Aquecimento clássico.',
        exec: 'Salte abrindo pernas e braços.',
        dica: 'Pouse suavemente.',
        rec: 'Aqueça bem.',
        alvo: 'Todos'
    },
    'Ponte de Glúteos (com Peso Corporal)': {
        desc: 'Ativação de glúteos.',
        exec: 'Deitado, eleve o quadril contraindo glúteos.',
        dica: 'Pés firmes no chão.',
        rec: 'Não force a lombar.',
        alvo: 'Iniciante'
    },
    'Posição da Criança (Child\'s Pose)': {
        desc: 'Relaxamento lombar.',
        exec: 'Ajoelhe e estenda os braços à frente no chão.',
        dica: 'Respire fundo.',
        rec: 'Relaxe.',
        alvo: 'Todos'
    },
    'Prancha com os Pés na Bola': {
        desc: 'Core avançado.',
        exec: 'Mantenha a prancha com pés na bola suíça.',
        dica: 'Equilíbrio é chave.',
        rec: 'Contraia tudo.',
        alvo: 'Avançado'
    },
    'Prancha com Toques nos Ombros': {
        desc: 'Anti-rotação de core.',
        exec: 'Em prancha, toque a mão no ombro oposto sem girar o quadril.',
        dica: 'Pés mais afastados ajudam.',
        rec: 'Estabilidade.',
        alvo: 'Intermediário'
    },
    'Prancha Frontal': {
        desc: 'Estabilidade abdominal.',
        exec: 'Apoie antebraços e ponta dos pés, corpo reto.',
        dica: 'Não deixe o quadril cair.',
        rec: 'Olhe para as mãos.',
        alvo: 'Todos'
    },
    'Prancha Lateral': {
        desc: 'Foco nos oblíquos.',
        exec: 'Deite de lado e eleve o quadril.',
        dica: 'Cotovelo abaixo do ombro.',
        rec: 'Corpo alinhado.',
        alvo: 'Todos'
    },
    'Pull-Down Máquina Assistida': {
        desc: 'Simulador de barra fixa.',
        exec: 'Puxe as manoplas para baixo.',
        dica: 'Mantenha o peito aberto.',
        rec: 'Ajuste o assento.',
        alvo: 'Iniciante'
    },
    'Pulley Frente (Puxada Alta)': {
        desc: 'Variação clássica para alargar as costas.',
        exec: 'Mãos afastadas, palmas para frente. Puxe o peito em direção à barra.',
        dica: 'Foque em puxar com os cotovelos, não com as mãos.',
        rec: 'Evite balançar o corpo (kipping) se o foco é hipertrofia.',
        alvo: 'Avançado'
    },
    'Pulley Triângulo (Puxada Fechada)': {
        desc: 'Foco na parte central das costas e espessura.',
        exec: 'Sentado na polia, puxe o triângulo até o peito.',
        dica: 'Estufe o peito ao puxar e alongue bem na volta.',
        rec: 'Mantenha o tronco levemente inclinado para trás.',
        alvo: 'Iniciante/Intermediário'
    },
    'Puxada Alta com Corda na Polia Alta': {
        desc: 'Variação para dorsais com maior amplitude (Face Pull ou Puxada Estendida).',
        exec: 'Puxe a corda em direção ao rosto ou peito, abrindo os cotovelos.',
        dica: 'Foco nos deltoides posteriores e parte alta das costas.',
        rec: 'Controle o retorno do peso.',
        alvo: 'Intermediário'
    },
    'Puxada de Braços com Banda (Simulando Pulley)': {
        desc: 'Exercício de costas usando elástico, ótimo para aquecimento ou casa.',
        exec: 'Prenda a banda no alto e puxe em direção ao corpo.',
        dica: 'Mantenha tensão na banda o tempo todo.',
        rec: 'Faça altas repetições.',
        alvo: 'Iniciante'
    },
    'Pássaro-Cão (Bird-Dog)': {
        desc: 'Exercício de estabilidade de core e coordenação.',
        exec: 'Em quatro apoios, estenda braço direito e perna esquerda simultaneamente.',
        dica: 'Imagine que tem um copo de água nas costas e não pode derramar.',
        rec: 'Segure 2 segundos na posição estendida.',
        alvo: 'Iniciante/Reabilitação'
    },
    'Remada Baixa com Barra': {
        desc: 'Exercício composto para espessura das costas.',
        exec: 'Tronco inclinado, puxe a barra em direção ao umbigo.',
        dica: 'Mantenha a coluna neutra, não arredonde as costas.',
        rec: 'Use o cinto se a carga for alta.',
        alvo: 'Avançado'
    },
    'Remada Curvada com Barra': {
        desc: 'Um dos melhores construtores de massa para as costas.',
        exec: 'Inclina o tronco quase paralelo ao chão, puxe a barra no abdômen.',
        dica: 'Cotovelos passam rente ao corpo.',
        rec: 'Cuidado com a lombar.',
        alvo: 'Intermediário/Avançado'
    },
    'Remada Máquina com Apoio de Peito': {
        desc: 'Remada segura isolando as costas sem sobrecarregar a lombar.',
        exec: 'Apoie o peito no pad e puxe as manoplas.',
        dica: 'Concentre-se em juntar as escápulas no final.',
        rec: 'Ajuste a altura do banco para que o apoio fique no esterno.',
        alvo: 'Iniciante'
    },
    'Remada Unilateral com Haltere': {
        desc: 'Remada Serrote, excelente para corrigir assimetrias.',
        exec: 'Apoie mão e joelho no banco, puxe o halter com a outra mão.',
        dica: 'Puxe o halter em direção ao quadril, não ao ombro.',
        rec: 'Mantenha as costas retas.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Costas (DorsaisTorácica)': {
        desc: 'Liberação miofascial para as costas.',
        exec: 'Role a parte superior das costas sobre o rolo.',
        dica: 'Cruze os braços para expor melhor a musculatura.',
        rec: 'Evite rolar sobre a lombar excessivamente.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Glúteos': {
        desc: 'Alívio para tensão nos glúteos e piriforme.',
        exec: 'Sente sobre o rolo, cruze uma perna e incline para o lado do glúteo.',
        dica: 'Procure os pontos mais doloridos e segure.',
        rec: 'Respire fundo.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Isquiotibiais': {
        desc: 'Liberação da parte posterior da coxa.',
        exec: 'Coloque o rolo sob as coxas e use as mãos para mover o corpo.',
        dica: 'Faça uma perna de cada vez para mais pressão.',
        rec: 'Role devagar.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - IT Band (Fascia Lateral)': {
        desc: 'Liberação da banda iliotibial (lateral da coxa).',
        exec: 'Deite de lado com o rolo sob a coxa e deslize.',
        dica: 'Geralmente é doloroso, vá com calma.',
        rec: 'Não role sobre a articulação do joelho.',
        alvo: 'Corredores'
    },
    'Rolo de Espuma - Panturrilhas': {
        desc: 'Massagem para relaxar as panturrilhas.',
        exec: 'Apoie a panturrilha no rolo, cruze a outra perna por cima.',
        dica: 'Gire o pé para pegar as laterais.',
        rec: 'Ótimo pós-corrida.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Peitoral': {
        desc: 'Ajuda a abrir os ombros e soltar o peitoral.',
        exec: 'Deite de bruços com o rolo sob o peito/ombro e role curto.',
        dica: 'Estenda o braço para melhor efeito.',
        rec: 'Cuidado com a pressão excessiva.',
        alvo: 'Todos'
    },
    'Rolo de Espuma - Quadríceps': {
        desc: 'Liberação da parte frontal da coxa.',
        exec: 'De bruços, apoie as coxas no rolo e mova-se com os antebraços.',
        dica: 'Mantenha o corpo em prancha.',
        rec: 'Role até perto do quadril e até perto do joelho.',
        alvo: 'Todos'
    },
    'Rosca Alternada com Halteres': {
        desc: 'Clássico para bíceps com rotação de punho.',
        exec: 'Em pé, suba um halter de cada vez, girando a palma para cima.',
        dica: 'Mantenha os cotovelos fixos ao lado do corpo.',
        rec: 'Não balance o tronco para ajudar.',
        alvo: 'Todos'
    },
    'Rosca Concentrada': {
        desc: 'Isolamento total do pico do bíceps.',
        exec: 'Sentado, apoie o cotovelo na parte interna da coxa e flexione o braço.',
        dica: 'Não deixe o ombro ajudar no movimento.',
        rec: 'Controle bem a descida.',
        alvo: 'Intermediário'
    },
    'Rosca Direta com Barra': {
        desc: 'O construtor de massa para bíceps.',
        exec: 'Segure a barra com palmas para cima, flexione os cotovelos.',
        dica: 'Evite jogar os cotovelos para frente.',
        rec: 'Mantenha postura ereta.',
        alvo: 'Todos'
    },
    'Rosca Direta na Polia Baixa': {
        desc: 'Tensão constante no bíceps durante todo o movimento.',
        exec: 'Use uma barra curta na polia baixa e faça a flexão de braços.',
        dica: 'A polia mantém a tensão mesmo quando o braço está esticado.',
        rec: 'Bom para finalizar o treino.',
        alvo: 'Iniciante'
    },
    'Rosca Scott Máquina': {
        desc: 'Isolamento de bíceps com apoio, impedindo "roubo".',
        exec: 'Apoie os braços no banco Scott e puxe a máquina.',
        dica: 'Estenda quase tudo, mas não trave o cotovelo no final.',
        rec: 'Ajuste o banco para a axila ficar encaixada.',
        alvo: 'Iniciante/Intermediário'
    },
    'Rotação de Braços (PequenosGrandes Círculos)': {
        desc: 'Aquecimento articular para ombros.',
        exec: 'Com braços abertos, faça círculos pequenos e vá aumentando.',
        dica: 'Faça nos dois sentidos (horário e anti-horário).',
        rec: 'Essencial antes de treinos de peito/ombro.',
        alvo: 'Todos'
    },
    'Rotação de Tronco': {
        desc: 'Mobilidade para coluna torácica.',
        exec: 'Em pé ou sentado, gire o tronco de um lado para o outro.',
        dica: 'Mantenha o quadril fixo, gire só a cintura para cima.',
        rec: 'Movimento controlado.',
        alvo: 'Todos'
    },
    'Rotação de Tronco na Polia': {
        desc: 'Fortalecimento do core rotacional (Woodchopper).',
        exec: 'Segure a polia lateralmente e gire o tronco levando a alça para o outro lado.',
        dica: 'Use a força do abdômen, não só dos braços.',
        rec: 'Pés giram levemente para acompanhar.',
        alvo: 'Intermediário'
    },
    'Shuffle (Deslocamento Lateral)': {
        desc: 'Exercício cardio e de agilidade.',
        exec: 'Desloque-se lateralmente rápido sem cruzar os pés.',
        dica: 'Mantenha os joelhos semi-flexionados (base atlética).',
        rec: 'Use para elevar a frequência cardíaca.',
        alvo: 'Todos'
    },
    'Skipping Alto (Corrida Elevando Joelhos)': {
        desc: 'Cardio intenso e aquecimento.',
        exec: 'Corra no lugar elevando bem os joelhos em direção ao peito.',
        dica: 'Coordene com os braços.',
        rec: 'Aterrisse na ponta dos pés.',
        alvo: 'Todos'
    },
    'Slam Ball (Arremesso de Medicine Ball)': {
        desc: 'Potência e explosão para o corpo todo.',
        exec: 'Levante a bola acima da cabeça e arremesse com força no chão.',
        dica: 'Use o corpo todo, agachando ao arremessar.',
        rec: 'Cuidado com o rebote da bola.',
        alvo: 'Intermediário'
    },
    'Smith Machine': {
        desc: 'Barra guiada, usada para agachamentos, supinos e afundos.',
        exec: 'Varia conforme o exercício, mas a barra segue um trilho fixo.',
        dica: 'Posicione os pés corretamente para compensar a falta de movimento horizontal.',
        rec: 'Mais seguro para fazer sozinho.',
        alvo: 'Todos'
    },
    'Step-Up com Halteres': {
        desc: 'Subida no banco, simulando escada com carga.',
        exec: 'Segurando halteres, suba em um banco ou caixa com uma perna e depois desça.',
        dica: 'Faça força no calcanhar da perna que está subindo.',
        rec: 'Mantenha o tronco alto na subida.',
        alvo: 'Todos'
    },
    'Superman (Extensão de Costas)': {
        desc: 'Fortalecimento da lombar e paravertebrais.',
        exec: 'Deitado de bruços, eleve braços e pernas simultaneamente.',
        dica: 'Segure 1-2 segundos no topo.',
        rec: 'Olhe para o chão para não forçar o pescoço.',
        alvo: 'Iniciante'
    },
    'Supino Máquina Horizontal': {
        desc: 'Exercício guiado para peitoral.',
        exec: 'Empurre as manoplas à frente estendendo os braços.',
        dica: 'Não desencoste as costas do banco.',
        rec: 'Ótimo para iniciantes ganharem força.',
        alvo: 'Iniciante'
    },
    'Supino na Bola Suíça': {
        desc: 'Supino com instabilidade, ativando mais o core.',
        exec: 'Apoie as costas na bola e execute o supino com halteres.',
        dica: 'Mantenha o quadril elevado em ponte.',
        rec: 'Use cargas menores que no banco.',
        alvo: 'Intermediário'
    },
    'Supino Reto com Halteres': {
        desc: 'Construtor de peitoral com maior amplitude que a barra.',
        exec: 'Deitado, empurre os halteres para cima unindo-os no topo.',
        dica: 'Desça os halteres até a linha do peito.',
        rec: 'Mantenha os pés firmes no chão.',
        alvo: 'Todos'
    },
    'Terra Convencional (Deadlift)': {
        desc: 'Exercício de força total (costas, pernas, glúteos).',
        exec: 'Barra no chão, pegue na largura dos ombros, levante estendendo quadril e joelhos.',
        dica: 'Mantenha a barra colada na perna durante a subida.',
        rec: 'Coluna neutra é obrigatória. Não arredonde.',
        alvo: 'Avançado'
    },
    'Terra Romeno (Stiff-Legged Deadlift)': {
        desc: 'Foco total em posteriores de coxa e glúteos.',
        exec: 'Com joelhos semi-flexionados, incline o tronco à frente descendo a barra rente à perna.',
        dica: 'Sinta alongar atrás da coxa.',
        rec: 'Vá apenas até onde sua coluna permitir sem curvar.',
        alvo: 'Intermediário'
    },
    'Torção da Coluna Sentada': {
        desc: 'Mobilidade e alívio lombar.',
        exec: 'Sentado, gire o tronco para um lado usando a mão no joelho oposto como alavanca.',
        dica: 'Cresça a coluna antes de girar.',
        rec: 'Faça suavemente.',
        alvo: 'Todos'
    },
    'Tríceps Banco (Dipping entre Bancos)': {
        desc: 'Exercício de peso corporal para tríceps.',
        exec: 'Apoie as mãos num banco atrás de você, pés noutro banco ou chão. Flexione os cotovelos.',
        dica: 'Mantenha as costas rente ao banco de apoio.',
        rec: 'Cuidado se tiver dores no ombro.',
        alvo: 'Iniciante'
    },
    'Tríceps Coice (Kickback)': {
        desc: 'Isolamento de tríceps com halter.',
        exec: 'Tronco inclinado, cotovelo alto e fixo. Estenda o braço para trás.',
        dica: 'Só o antebraço se move.',
        rec: 'Use carga leve para focar na contração.',
        alvo: 'Todos'
    },
    'Tríceps Corda na Polia Alta': {
        desc: 'Um dos melhores para a cabeça lateral do tríceps.',
        exec: 'Puxe a corda para baixo e abra as mãos no final do movimento.',
        dica: 'Cotovelos colados nas costelas.',
        rec: 'Não suba as mãos acima da altura do peito na volta.',
        alvo: 'Todos'
    },
    'Tríceps Máquina com Corda': {
        desc: 'Variação similar à polia, mas em máquina específica.',
        exec: 'Estenda os braços empurrando a carga.',
        dica: 'Foco total na extensão do cotovelo.',
        rec: 'Mantenha postura.',
        alvo: 'Iniciante'
    },
    'Tríceps Testa com Barra (Skull Crusher)': {
        desc: 'Construtor de massa para tríceps.',
        exec: 'Deitado, desça a barra em direção à testa dobrando os cotovelos.',
        dica: 'Mantenha os cotovelos apontando para o teto.',
        rec: 'Peça ajuda (spotter) se for usar muita carga.',
        alvo: 'Intermediário'
    },
    'Tríceps Testa Máquina': {
        desc: 'Versão guiada do tríceps testa.',
        exec: 'Sentado, empurre o apoio para frente/baixo.',
        dica: 'Mantenha os cotovelos fechados.',
        rec: 'Seguro para iniciantes.',
        alvo: 'Iniciante'
    },
    'Turkish Get-Up': {
        desc: 'Exercício funcional complexo de corpo total.',
        exec: 'Levante-se do chão segurando um peso acima da cabeça o tempo todo.',
        dica: 'Requer uma sequência específica de movimentos. Aprenda sem peso primeiro.',
        rec: 'Olhe sempre para o peso.',
        alvo: 'Avançado'
    }
};

async function seed() {
    try {
        console.log(" Iniciando Seed da Biblioteca de Exercícios...");
        let count = 0;
        
        for (const [name, url] of Object.entries(EXERCISE_URLS)) {
            const data = EXERCISE_DATA[name];
            if (!data) {
                console.warn(`⚠️ Sem dados para: ${name}`);
                continue;
            }

            // Verifica se já existe
            const check = await pool.query("SELECT id FROM exercise_library WHERE name = $1", [name]);

            if (check.rows.length > 0) {
                // Atualiza
                await pool.query(`
                    UPDATE exercise_library SET 
                        description=$1, recommendations=$2, execution_instructions=$3, tips=$4, target_audience=$5, image_url=$6 
                    WHERE id=$7
                `, [data.desc, data.rec, data.exec, data.dica, data.alvo, url, check.rows[0].id]);
            } else {
                // Insere
                await pool.query(`
                    INSERT INTO exercise_library (name, description, recommendations, execution_instructions, tips, target_audience, image_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [name, data.desc, data.rec, data.exec, data.dica, data.alvo, url]);
            }
            console.log(`✅ ${name}`);
            count++;
        }
        console.log(`\n Sucesso! ${count} exercícios processados.`);
    } catch (err) {
        console.error("❌ Erro fatal:", err);
    } finally {
        process.exit();
    }
}

seed();
