-- Habilita extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Parâmetros Globais / Despesas Administrativas e Tributárias por Empresa/Usuário
CREATE TABLE configuracoes_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preco_diesel_litro NUMERIC(10,4) NOT NULL DEFAULT 0,
    aliquota_impostos_percent NUMERIC(5,2) NOT NULL DEFAULT 0, -- ISS, PIS, COFINS, IRPJ/CSLL efetivo
    encargos_trabalhistas_percent NUMERIC(5,2) NOT NULL DEFAULT 0, -- INSS, FGTS, 13º, Férias, Provisões
    despesa_administrativa_mensal NUMERIC(12,2) NOT NULL DEFAULT 0, -- Rateio fixo (escritório, gestão, sistemas)
    margem_lucro_desejada_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Indústrias e Contratos (com calendário próprio)
CREATE TABLE industrias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    dias_operacao_semana INTEGER NOT NULL DEFAULT 5 CHECK (dias_operacao_semana BETWEEN 1 AND 7),
    dias_uteis_mes INTEGER NOT NULL DEFAULT 22 CHECK (dias_uteis_mes BETWEEN 1 AND 31),
    operacao_24h BOOLEAN NOT NULL DEFAULT FALSE,
    quantidade_turnos INTEGER NOT NULL DEFAULT 3 CHECK (quantidade_turnos >= 1),
    total_funcionarios_transportados INTEGER NOT NULL DEFAULT 0,
    valor_contrato_mensal_atual NUMERIC(12,2) DEFAULT 0,
    status_contrato TEXT NOT NULL DEFAULT 'ativo' CHECK (status_contrato IN ('ativo', 'em_negociacao', 'encerrado')),
    data_inicio_contrato DATE,
    data_fim_contrato DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Frota de Ônibus
CREATE TABLE onibus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    placa TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano_fabricacao INTEGER NOT NULL,
    capacidade_passageiros INTEGER NOT NULL,
    valor_aquisicao NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_residual NUMERIC(12,2) NOT NULL DEFAULT 0,
    vida_util_meses INTEGER NOT NULL DEFAULT 60 CHECK (vida_util_meses > 0),
    consumo_km_litro NUMERIC(6,2) NOT NULL DEFAULT 0,
    manutencao_mensal_estimada NUMERIC(10,2) NOT NULL DEFAULT 0,
    seguro_licenciamento_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'reserva')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Motoristas e Custos Trabalhistas
CREATE TABLE motoristas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnh_categoria TEXT NOT NULL DEFAULT 'D',
    turno_principal TEXT NOT NULL, -- Ex: '1º Turno (Manhã)', '2º Turno (Tarde)', '3º Turno (Noite)', 'Madrugada'
    salario_base_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
    adicional_noturno_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
    horas_extras_mensais NUMERIC(10,2) NOT NULL DEFAULT 0,
    beneficios_mensais NUMERIC(10,2) NOT NULL DEFAULT 0, -- VA, VR, Plano de Saúde
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Linhas, Rotas, Pontos de Embarque e Turnos
CREATE TABLE linhas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    industria_id UUID NOT NULL REFERENCES industrias(id) ON DELETE CASCADE,
    onibus_id UUID REFERENCES onibus(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES motoristas(id) ON DELETE SET NULL,
    codigo_linha TEXT NOT NULL,
    nome_rota TEXT NOT NULL,
    turno TEXT NOT NULL,
    horario_saida TIME NOT NULL,
    horario_chegada TIME NOT NULL,
    km_ida_volta NUMERIC(8,2) NOT NULL DEFAULT 0,
    viagens_por_dia INTEGER NOT NULL DEFAULT 1,
    passageiros_alocados INTEGER NOT NULL DEFAULT 0,
    pontos_embarque JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de objetos {ordem, local, horario}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Histórico de Alterações (Auditoria)
CREATE TABLE historico_alteracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tabela_afetada TEXT NOT NULL,
    operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
-- ==========================================
ALTER TABLE configuracoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE industrias ENABLE ROW LEVEL SECURITY;
ALTER TABLE onibus ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso proprio configuracoes" ON configuracoes_financeiras
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Acesso proprio industrias" ON industrias
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Acesso proprio onibus" ON onibus
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Acesso proprio motoristas" ON motoristas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Acesso proprio linhas" ON linhas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura historico proprio" ON historico_alteracoes
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- TRIGGER AUTOMÁTICO DE AUDITORIA
-- ==========================================
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO historico_alteracoes (user_id, tabela_afetada, operacao, registro_id, dados_anteriores)
        VALUES (OLD.user_id, TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO historico_alteracoes (user_id, tabela_afetada, operacao, registro_id, dados_anteriores, dados_novos)
        VALUES (NEW.user_id, TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO historico_alteracoes (user_id, tabela_afetada, operacao, registro_id, dados_novos)
        VALUES (NEW.user_id, TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_config AFTER INSERT OR UPDATE OR DELETE ON configuracoes_financeiras FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_industrias AFTER INSERT OR UPDATE OR DELETE ON industrias FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_onibus AFTER INSERT OR UPDATE OR DELETE ON onibus FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_motoristas AFTER INSERT OR UPDATE OR DELETE ON motoristas FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_linhas AFTER INSERT OR UPDATE OR DELETE ON linhas FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
