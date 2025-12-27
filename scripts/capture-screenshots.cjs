/**
 * Script para capturar screenshots automaticos do sistema OmniFy HUB
 *
 * Uso: node scripts/capture-screenshots.js
 *
 * Requisitos:
 * - Frontend rodando em http://localhost:5173
 * - Backend rodando em http://localhost:8000
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuracoes
const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'admin@demo.com',
  password: 'password'
};
const SCREENSHOT_DIR = path.join(__dirname, '../docs/screenshots');
const VIEWPORT = { width: 1920, height: 1080 };

// Lista de screenshots a capturar
const screenshots = [
  // Login (antes de logar)
  { name: '01-login', route: '/login', waitFor: 'input[type="email"]', skipAuth: true },

  // Apos login
  { name: '02-menu-lateral', route: '/', waitFor: '.sidebar, [data-sidebar]', action: 'expandMenu' },
  { name: '03-dashboard', route: '/', waitFor: '[data-testid="dashboard"], .dashboard, main' },

  // Atendimento
  { name: '04-leads-kanban', route: '/leads', waitFor: '[data-testid="kanban"], .kanban-board, main' },
  { name: '05-criar-lead', route: '/leads', waitFor: 'button', action: 'openNewLeadModal' },
  { name: '06-importar-leads', route: '/leads', waitFor: 'button', action: 'openImportModal' },
  { name: '07-tickets', route: '/tickets', waitFor: 'main' },
  { name: '08-contatos', route: '/contacts', waitFor: 'main' },
  { name: '09-tarefas', route: '/tasks', waitFor: 'main' },
  { name: '10-agendamentos', route: '/appointments', waitFor: 'main' },
  { name: '11-minha-agenda', route: '/schedule', waitFor: 'main' },
  { name: '12-respostas-rapidas', route: '/quick-replies', waitFor: 'main' },

  // Marketing
  { name: '14-produtos', route: '/products', waitFor: 'main' },
  { name: '17-landing-pages', route: '/landing-pages', waitFor: 'main' },

  // Content
  { name: '19-content-dashboard', route: '/content', waitFor: 'main' },
  { name: '20-content-chat', route: '/content/chat', waitFor: 'main' },

  // Metas
  { name: '21-metas', route: '/goals', waitFor: 'main' },
  { name: '22-relatorios', route: '/reports', waitFor: 'main' },

  // SDR
  { name: '23-sdr-hub', route: '/sdr', waitFor: 'main' },

  // Ads
  { name: '24-ads-dashboard', route: '/ads', waitFor: 'main' },

  // BI
  { name: '26-bi-dashboard', route: '/bi', waitFor: 'main' },
  { name: '27-bi-analyst', route: '/bi/analyst', waitFor: 'main' },

  // Configuracoes
  { name: '28-config-canais', route: '/settings/channels', waitFor: 'main' },
  { name: '29-config-equipe', route: '/settings/team', waitFor: 'main' },
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page) {
  console.log('Fazendo login via API...');

  // Fazer login via API diretamente
  const http = require('http');

  const loginData = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: CREDENTIALS.email,
      password: CREDENTIALS.password
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Resposta invalida do servidor'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!loginData.access_token) {
    console.log('ERRO: Login falhou:', loginData.message || 'Token nao recebido');
    return false;
  }

  console.log('Token obtido com sucesso!');

  // Navegar para a pagina e injetar o token
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

  // Injetar auth no localStorage usando formato do Zustand persist (chave: crm-auth)
  await page.evaluate((token, user, tenant) => {
    const authState = {
      state: {
        token: token,
        user: user,
        tenant: tenant,
        isAuthenticated: true
      },
      version: 0
    };
    localStorage.setItem('crm-auth', JSON.stringify(authState));
    console.log('Auth injetado:', authState);
  }, loginData.access_token, loginData.user || null, loginData.tenant || null);

  console.log('Auth injetado no localStorage (crm-auth)');

  // Recarregar a pagina para o app ler o localStorage
  await page.reload({ waitUntil: 'networkidle2' });
  await delay(2000);

  const finalUrl = page.url();
  console.log(`URL apos login: ${finalUrl}`);

  if (!finalUrl.includes('/login')) {
    console.log('Login realizado com sucesso!');
    return true;
  } else {
    console.log('AVISO: Redirecionado para login. Tentando novamente...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await delay(2000);
    return !page.url().includes('/login');
  }
}

async function captureScreenshot(page, config) {
  const { name, route, waitFor, action, skipAuth } = config;
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);

  console.log(`Capturando: ${name} (${route})`);

  try {
    // Navegar para a rota
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Aguardar elemento especifico
    if (waitFor) {
      try {
        await page.waitForSelector(waitFor, { timeout: 5000 });
      } catch (e) {
        console.log(`  Aviso: Elemento ${waitFor} nao encontrado, capturando mesmo assim`);
      }
    }

    // Executar acoes especiais
    if (action === 'expandMenu') {
      // Tentar expandir o menu lateral
      const menuToggle = await page.$('[data-sidebar-toggle], .sidebar-toggle, button[aria-label*="menu"]');
      if (menuToggle) {
        await menuToggle.click();
        await delay(500);
      }
    } else if (action === 'openNewLeadModal') {
      // Tentar abrir modal de novo lead
      const newButton = await page.$('button:has-text("Novo"), button:has-text("Add"), [data-testid="new-lead"]');
      if (newButton) {
        await newButton.click();
        await delay(1000);
      }
    } else if (action === 'openImportModal') {
      // Tentar abrir modal de importacao
      const importButton = await page.$('button:has-text("Importar"), button:has-text("Import")');
      if (importButton) {
        await importButton.click();
        await delay(1000);
      }
    }

    await delay(1000);

    // Capturar screenshot
    await page.screenshot({
      path: filepath,
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height
      }
    });

    console.log(`  Salvo: ${filepath}`);
    return true;
  } catch (error) {
    console.error(`  Erro ao capturar ${name}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('OmniFy HUB - Captura Automatica de Screenshots');
  console.log('='.repeat(60));
  console.log('');

  // Criar diretorio se nao existir
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Iniciar browser
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: VIEWPORT,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  let successCount = 0;
  let errorCount = 0;

  try {
    // Capturar tela de login primeiro (sem auth)
    const loginScreenshot = screenshots.find(s => s.skipAuth);
    if (loginScreenshot) {
      const success = await captureScreenshot(page, loginScreenshot);
      if (success) successCount++;
      else errorCount++;
    }

    // Fazer login
    await login(page);

    // Capturar demais screenshots
    for (const config of screenshots) {
      if (config.skipAuth) continue; // Ja capturado

      const success = await captureScreenshot(page, config);
      if (success) successCount++;
      else errorCount++;

      await delay(500);
    }

  } catch (error) {
    console.error('Erro geral:', error.message);
  } finally {
    console.log('');
    console.log('='.repeat(60));
    console.log(`Concluido! Sucesso: ${successCount} | Erros: ${errorCount}`);
    console.log(`Screenshots salvos em: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60));

    // Fechar browser apos alguns segundos
    await delay(3000);
    await browser.close();
  }
}

main().catch(console.error);
