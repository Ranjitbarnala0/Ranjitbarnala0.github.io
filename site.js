/* Recambia static storefront: cart (localStorage), instant search, quantity steppers, toast. No framework. */
(function () {
  'use strict'
  var KEY = 'recambia.cart.v1'
  var IVA = 0.21
  var WA = document.documentElement.getAttribute('data-wa') || ''
  var eur = function (n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }
  var read = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} }
  }
  var save = function (c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)) } catch (e) {}
    paintCount()
  }
  var units = function (c) {
    return Object.keys(c).reduce(function (s, k) { return s + c[k].q }, 0)
  }
  var paintCount = function () {
    var n = units(read())
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump')
    })
  }
  var unitPrice = function (item, q) {
    var p = item.p
    ;(item.tiers || []).forEach(function (t) { if (q >= t[0]) p = Math.min(p, t[1]) })
    return p
  }

  // ---------------------------------------------------------------- toast
  var toastEl
  var toast = function (html) {
    if (!toastEl) {
      toastEl = document.createElement('div')
      toastEl.className = 'toast'
      toastEl.setAttribute('role', 'status')
      document.body.appendChild(toastEl)
    }
    toastEl.innerHTML = html
    toastEl.classList.add('show')
    clearTimeout(toastEl._t)
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show') }, 3200)
  }

  // ---------------------------------------------------------------- add to cart
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]')
    if (b) {
      var d = JSON.parse(b.getAttribute('data-add'))
      var qi = b.closest('.buy') ? b.closest('.buy').querySelector('.qty input') : null
      var q = Math.max(1, parseInt(qi ? qi.value : '1', 10) || 1)
      var c = read()
      c[d.sku] = c[d.sku] ? Object.assign(c[d.sku], { q: c[d.sku].q + q }) : Object.assign(d, { q: q })
      save(c)
      var label = b.innerHTML
      b.classList.add('added'); b.innerHTML = 'Añadido ✓'
      setTimeout(function () { b.classList.remove('added'); b.innerHTML = label }, 1400)
      toast('<span>Añadido al carrito: <b>' + d.t.replace(/</g, '&lt;') + '</b> · ' + q + ' uds.</span><a href="/carrito/">Ver carrito</a>')
      return
    }
    var pic = e.target.closest('[data-pic]')
    if (pic) {
      document.getElementById('main-pic').src = pic.getAttribute('data-pic')
      pic.parentNode.querySelectorAll('[data-pic]').forEach(function (b) { b.classList.toggle('on', b === pic) })
      return
    }
    var step = e.target.closest('[data-step]')
    if (step) {
      var input = step.parentNode.querySelector('input')
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(step.getAttribute('data-step'), 10))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })

  // ---------------------------------------------------------------- search (index loaded on first use)
  var index = null
  var loading = null
  var norm = function (s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  }
  var load = function () {
    if (index) return Promise.resolve(index)
    if (!loading) loading = fetch('/search.json').then(function (r) { return r.json() }).then(function (j) {
      j.m.forEach(function (m) { m.k = norm(m[0] + ' ' + m[2] + ' ' + (m[4] || '')) })
      j.p.forEach(function (p) { p.k = norm(p[0] + ' ' + p[1]) })
      index = j
      return j
    })
    return loading
  }
  var find = function (j, q, maxM, maxP) {
    var toks = norm(q).split(' ').filter(Boolean)
    if (!toks.length) return { m: [], p: [], total: 0 }
    var hit = function (k) { return toks.every(function (t) { return k.indexOf(t) >= 0 }) }
    var m = [], p = [], total = 0
    for (var i = 0; i < j.m.length && m.length < maxM; i++) if (hit(j.m[i].k)) m.push(j.m[i])
    for (var k = 0; k < j.p.length; k++) if (hit(j.p[k].k)) { total++; if (p.length < maxP) p.push(j.p[k]) }
    return { m: m, p: p, total: total }
  }
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  document.querySelectorAll('form.search').forEach(function (form) {
    var input = form.querySelector('input')
    var box = form.querySelector('.suggest')
    var active = -1
    var render = function () {
      var q = input.value
      if (norm(q).length < 2) { box.hidden = true; return }
      load().then(function (j) {
        if (input.value !== q) return
        var r = find(j, q, 5, 8)
        if (!r.m.length && !r.p.length) {
          box.innerHTML = '<h4>Sin resultados para «' + esc(q) + '»</h4><a class="all" href="/marcas/">Buscar por marca y modelo</a>'
        } else {
          box.innerHTML =
            (r.m.length ? '<h4>Modelos</h4>' + r.m.map(function (m) {
              return '<a href="' + m[1] + '"><img src="' + m[3] + '" alt=""><span><b>' + esc(m[0]) + '</b><br><span class="sku">' + esc(m[4] || '') + '</span></span><span></span></a>'
            }).join('') : '') +
            (r.p.length ? '<h4>Productos</h4>' + r.p.map(function (p) {
              return '<a href="' + p[2] + '"><img src="' + p[4] + '" alt=""><span>' + esc(p[0]) + '<br><span class="sku">' + esc(p[1]) + '</span></span><span class="price">' + eur(p[3]) + '</span></a>'
            }).join('') : '') +
            '<a class="all" href="/buscar/?q=' + encodeURIComponent(q) + '">Ver los ' + r.total + ' productos →</a>'
        }
        box.hidden = false
        active = -1
      })
    }
    input.addEventListener('input', render)
    input.addEventListener('focus', function () { load(); if (input.value) render() })
    input.addEventListener('keydown', function (e) {
      var links = box.querySelectorAll('a')
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        active = Math.max(0, Math.min(links.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)))
        links.forEach(function (a, i) { a.classList.toggle('on', i === active) })
      } else if (e.key === 'Enter' && active >= 0 && links[active]) {
        e.preventDefault(); location.href = links[active].href
      } else if (e.key === 'Escape') { box.hidden = true }
    })
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) box.hidden = true })
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      var i = document.querySelector('form.search input'); if (i) { e.preventDefault(); i.focus() }
    }
  })

  // ---------------------------------------------------------------- search results page
  var results = document.getElementById('results')
  if (results) {
    var q = new URLSearchParams(location.search).get('q') || ''
    document.querySelectorAll('form.search input').forEach(function (i) { i.value = q })
    var title = document.getElementById('results-title')
    load().then(function (j) {
      var r = find(j, q, 12, 120)
      title.textContent = q ? r.total + ' productos para «' + q + '»' : 'Busca por modelo, pieza o referencia'
      results.innerHTML =
        (r.m.length ? '<h2 style="margin:8px 0 14px">Modelos</h2><div class="grid">' + r.m.map(function (m) {
          return '<article class="card model"><a class="card-img" href="' + m[1] + '"><img src="' + m[3] + '" alt="" loading="lazy"></a><h3><a href="' + m[1] + '">' + esc(m[0]) + '</a></h3><div class="bottom"><a class="btn outline" href="' + m[1] + '">Ver recambios</a></div></article>'
        }).join('') + '</div>' : '') +
        (r.p.length ? '<h2 style="margin:28px 0 14px">Productos</h2><div class="grid">' + r.p.map(function (p) {
          var d = esc(JSON.stringify({ sku: p[1], t: p[0], p: p[3], u: p[2], i: p[4] }))
          return '<article class="card"><a class="card-img" href="' + p[2] + '"><img src="' + p[4] + '" alt="" loading="lazy"></a><h3><a href="' + p[2] + '">' + esc(p[0]) + '</a></h3><div class="sku">' + esc(p[1]) + '</div><div class="bottom"><div class="price">' + eur(p[3]) + ' <small>sin IVA</small></div><button class="btn" data-add="' + d + '">Añadir</button></div></article>'
        }).join('') + '</div>' : '') ||
        (q ? '<div class="empty">No encontramos nada para «' + esc(q) + '». Prueba con el modelo (por ejemplo «A54» o «iPhone 13»), la pieza («pantalla», «batería») o la referencia.</div>' : '')
    })
  }

  // ---------------------------------------------------------------- cart page
  var cartRoot = document.getElementById('cart')
  var drawCart = function () {
    var c = read()
    var keys = Object.keys(c)
    if (!keys.length) {
      cartRoot.innerHTML = '<div class="empty"><p>Tu carrito está vacío.</p><p><a class="btn" href="/marcas/">Buscar por marca y modelo</a> <a class="btn outline" href="/pedido-rapido/">Pedido rápido por referencias</a></p></div>'
      return
    }
    var sub = 0
    var rows = keys.map(function (k) {
      var it = c[k]
      var up = unitPrice(it, it.q)
      sub += up * it.q
      return '<tr><td class="hide-sm"><img src="' + it.i + '" alt=""></td><td><a href="' + it.u + '">' + esc(it.t) + '</a><div class="sku" style="font:12px ui-monospace,Consolas,monospace;color:#66717d">' + esc(k) + '</div></td>' +
        '<td class="num hide-sm">' + eur(up) + '</td><td><div class="qty"><button type="button" data-step="-1" aria-label="Menos">−</button><input data-sku="' + esc(k) + '" value="' + it.q + '" inputmode="numeric" aria-label="Cantidad"><button type="button" data-step="1" aria-label="Más">+</button></div></td>' +
        '<td class="num"><b>' + eur(up * it.q) + '</b></td><td><button class="remove" data-remove="' + esc(k) + '" aria-label="Quitar">×</button></td></tr>'
    }).join('')
    var iva = sub * IVA
    var lines = keys.map(function (k) { return c[k].q + ' × ' + k + ' — ' + c[k].t }).join('\n')
    var text = 'Hola, quiero hacer este pedido:\n' + lines + '\n\nTotal sin IVA: ' + eur(sub)
    cartRoot.innerHTML =
      '<div class="cart-layout"><div><table class="cart-table"><thead><tr><th class="hide-sm"></th><th>Producto</th><th class="num hide-sm">Precio ud.</th><th>Cantidad</th><th class="num">Importe</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<aside class="summary"><div class="row"><span>Subtotal (sin IVA)</span><b>' + eur(sub) + '</b></div><div class="row"><span>IVA 21 %</span><span>' + eur(iva) + '</span></div>' +
      '<div class="row total"><span>Total</span><span>' + eur(sub + iva) + '</span></div><small style="color:#66717d">Envío y recargo de equivalencia se calculan al confirmar el pedido.</small>' +
      (WA ? '<a class="btn wa lg" target="_blank" rel="noopener" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(text) + '">Enviar pedido por WhatsApp</a>' : '') +
      '<button class="btn outline" type="button" id="copy-order">Copiar pedido</button><a class="btn outline" href="/alta/">Solicitar cuenta profesional</a></aside></div>'
    var copy = document.getElementById('copy-order')
    copy.addEventListener('click', function () {
      try { navigator.clipboard.writeText(text).then(function () { copy.textContent = 'Copiado ✓' }) } catch (e) {}
    })
  }
  if (cartRoot) {
    drawCart()
    cartRoot.addEventListener('change', function (e) {
      var sku = e.target.getAttribute('data-sku')
      if (!sku) return
      var c = read()
      c[sku].q = Math.max(1, parseInt(e.target.value, 10) || 1)
      save(c); drawCart()
    })
    cartRoot.addEventListener('click', function (e) {
      var r = e.target.closest('[data-remove]')
      if (!r) return
      var c = read(); delete c[r.getAttribute('data-remove')]; save(c); drawCart()
    })
  }

  // ---------------------------------------------------------------- quick order by reference
  var quick = document.getElementById('quick')
  if (quick) {
    quick.addEventListener('submit', function (e) {
      e.preventDefault()
      var out = document.getElementById('quick-out')
      load().then(function (j) {
        var bySku = {}
        j.p.forEach(function (p) { bySku[p[1].toUpperCase()] = p })
        var c = read(), ok = 0, bad = []
        quick.querySelector('textarea').value.split(/\n+/).forEach(function (line) {
          var m = line.trim().match(/^(?:(\d+)\s*[x×]\s*)?([A-Za-z0-9-]{4,})(?:[\s;,\t]+[x×]?\s*(\d+))?/)
          if (!m) return
          var p = bySku[m[2].toUpperCase()]
          var q = parseInt(m[3] || m[1] || '1', 10)
          if (!p) { bad.push(m[2]); return }
          c[p[1]] = c[p[1]] ? Object.assign(c[p[1]], { q: c[p[1]].q + q }) : { sku: p[1], t: p[0], p: p[3], u: p[2], i: p[4], q: q }
          ok++
        })
        save(c)
        out.innerHTML = '<div class="note">' + ok + ' referencias añadidas al carrito.' + (bad.length ? ' No encontradas: ' + esc(bad.join(', ')) + '.' : '') + ' <a href="/carrito/">Ver carrito →</a></div>'
      })
    })
  }

  paintCount()
})()
