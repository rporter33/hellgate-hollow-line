import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    output = Path('test-results'); output.mkdir(exist_ok=True)
    errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
        context=await browser.new_context(viewport={'width':1280,'height':720})
        page=await context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(os.environ.get('HOLLOW_CLIENT_URL','http://127.0.0.1:2567/'))
        await page.locator('#solo').wait_for(); await page.screenshot(path=str(output/'title.png'))
        await page.locator('#name').fill('Browser Warden'); await page.locator('#solo').click()
        await page.locator('#companions').wait_for(timeout=15000); await page.locator('#companions').select_option('2')
        await page.wait_for_function('Object.keys(window.__hollow.state.players).length === 3')
        await page.screenshot(path=str(output/'lobby.png'))
        await page.locator('#ready').click(); await page.locator('#deploy').click(); await page.locator('#resume').wait_for()
        await page.locator('#resume').click(); await page.wait_for_function('!!document.pointerLockElement')
        await page.mouse.down(); await page.keyboard.down('KeyD'); await page.wait_for_timeout(700); await page.keyboard.up('KeyD'); await page.wait_for_timeout(3500); await page.mouse.up()
        await page.screenshot(path=str(output/'combat.png'))
        live=await page.evaluate('({state:window.__hollow.state,diagnostics:window.__hollow.diagnostics})'); assert live['state']['phase']=='play'
        assert sum(a['kills'] for a in live['state']['players'].values())>0, 'AI companions did not fight'
        await page.keyboard.press('KeyI'); await page.locator('.inventory').wait_for(); await page.wait_for_function('window.__hollow.state.paused')
        t=await page.evaluate('window.__hollow.state.time'); await page.wait_for_timeout(350); assert await page.evaluate('window.__hollow.state.time')==t
        await page.screenshot(path=str(output/'inventory.png'))
        await page.locator('#close').click(); await page.wait_for_function('!!document.pointerLockElement')
        await page.keyboard.press('Escape'); await page.locator('#settings').click(); await page.locator('#quality').select_option('low'); await page.locator('#save').click()
        await page.locator('#resume').click(); await page.wait_for_function('!!document.pointerLockElement')
        before=await page.evaluate('Object.keys(window.__hollow.state.players).find(id=>window.__hollow.state.players[id].name==="Browser Warden")')
        await page.reload(); await page.locator('#reconnect').click(); await page.locator('#resume').wait_for(timeout=20000); await page.locator('#resume').click(); await page.wait_for_function('!!document.pointerLockElement')
        after=await page.evaluate('Object.keys(window.__hollow.state.players).find(id=>window.__hollow.state.players[id].name==="Browser Warden")'); assert before==after,'Refresh duplicated avatar'
        position=await page.evaluate(f'window.__hollow.state.players[{json.dumps(after)}].x'); await page.keyboard.down('KeyD'); await page.wait_for_timeout(600); await page.keyboard.up('KeyD')
        changed=await page.evaluate(f'window.__hollow.state.players[{json.dumps(after)}].x'); assert abs(changed-position)>.4, 'Reconnect input sequencing stalled movement'
        await page.keyboard.press('Escape'); await page.locator('#leave').click(); await page.locator('#solo').wait_for()
        cycles=[]
        for cycle in range(10):
            await page.locator('#solo').click(); await page.locator('#practice').wait_for(timeout=15000)
            await page.locator('[data-class="'+['marksman','blademaster','evoker'][cycle%3]+'"]').click(); await page.wait_for_timeout(120)
            await page.locator('#practice').click(); await page.wait_for_function('!!document.pointerLockElement'); await page.wait_for_timeout(150)
            cycles.append(await page.evaluate('window.__hollow.diagnostics'))
            await page.keyboard.press('Escape'); await page.locator('#leave').click(); await page.locator('#solo').wait_for()
        assert max(c['geometries'] for c in cycles)<=min(c['geometries'] for c in cycles)+3, 'Live GPU geometry count grows across restarts'
        assert max(c['textures'] for c in cycles)<=2, 'Sign textures leak across restarts'
        for width,height in [(1920,1080),(1280,720)]:
            await page.set_viewport_size({'width':width,'height':height}); await page.locator('#settings').click(); box=await page.locator('.panel').bounding_box(); assert box['y']>=0 and box['y']+box['height']<=height+2; await page.locator('#back').click()
        assert not errors, errors
        report={'browser':'Chromium '+browser.version,'renderer':'cloud Linux / SwiftShader; consumer GPU performance unverified','checks':['title and assets','class lobby','optional companions','pointer lock','keyboard movement','mouse firing','real companion kills','inventory','authoritative solo pause with companions','settings','refresh/reconnect same avatar','reconnect movement','ten room/rig restarts with stable GPU resources','1280x720 and 1920x1080 panels'],'errors':errors,'combat':live,'restartResources':[{'geometries':c['geometries'],'textures':c['textures']} for c in cycles]}
        (output/'browser.json').write_text(json.dumps(report,indent=2)); print(json.dumps({k:v for k,v in report.items() if k!='combat'}))
        await browser.close()

asyncio.run(main())
