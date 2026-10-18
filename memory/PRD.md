# Zelador Pro — PRD

## Problem statement
App mobile (pt-BR) para zelador de prédio residencial de 14 andares: controle de serviços por andar, checklists, manutenção recorrente, piscina aos sábados, controle de chaves, fotos, ocorrências e relatórios. Profissional, simples, botões grandes.

## User choices
- MVP: núcleo essencial (Início, 14 andares + checklist, chaves, piscina, rotina, ocorrências, fotos). Elevadores/hidrantes depois.
- Sem autenticação. Fotos apenas locais no celular. PDF compartilhável. Visual azul + cinza (claro/escuro).

## Architecture
- Backend: FastAPI + MongoDB (`/app/backend/server.py`): condominium, floors (seed 14), inspections, occurrences, routine_tasks, pool_records, key_logs, summary, reports/overview.
- Frontend: Expo Router, tabs (Início, Andares, Chaves, Mais) + stack screens: andar/[number], chaves/nova, chaves/[id], rotina, rotina/nova, piscina, piscina/[date], ocorrencias, ocorrencias/nova, historico. Ícones phosphor-react-native, fotos via expo-image-picker + expo-file-system (legacy), PDF via expo-print + expo-sharing.

## Implemented (2026-10-18)
- Dashboard com data, totais, 9 cartões de ação, status geral
- 14 andares com badge de pendências; checklist por categoria (Pendente/Concluído/Problema/N.A.), qtd. lâmpadas, local, descrição, fotos, histórico, resolver pendências
- Chaves: retirada, devolução, busca, filtros, destaque >24h, histórico
- Rotina diária (criar, concluir, excluir, atrasadas)
- Piscina por sábado (comparecimento, prestador, horários, checklist, fotos, totais)
- Ocorrências (categoria, prioridade, andar, fotos, resolver)
- Relatórios dia/semana/mês + PDF compartilhável
- Testes: backend 26/26, frontend 100%

## Backlog
- P1: Elevadores (quinzenal), hidrantes/extintores (mensal), manutenções recorrentes com alertas
- P1: Edição de ocorrências (status intermediários, responsável, prazo), seletor de data/hora nativo
- P2: Cadastro de funcionários/prestadores, configurações do condomínio, backup/exportação, login com perfis
