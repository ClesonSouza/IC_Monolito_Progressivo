import puppeteer from 'puppeteer';

export interface BrowserConfig {
  headless: boolean;
  args: string[];
}

const DEFAULT_CONFIG: BrowserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1440,900',
  ],
};

export async function launchBrowser(config: Partial<BrowserConfig> = {}): Promise<puppeteer.Browser> {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return puppeteer.launch({
    headless: merged.headless,
    args: merged.args,
  });
}

export async function createPage(browser: puppeteer.Browser): Promise<puppeteer.Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Desabilita o cache HTTP para evitar que recursos carregados em rodadas
  // anteriores sejam reutilizados. Isso garante que o tamanho dos arquivos
  // e a quantidade de requisições reflitam o que cada rodada realmente carregou.

  await page.setCacheEnabled(false);

  return page;
}

export async function closeBrowser(browser: puppeteer.Browser): Promise<void> {
  await browser.close();
}
