# Service Worker to Redirect Origin

This is a tool for your static website which could intercept all `GET` requests of the origin domain and redirect them to a given base-URL. Such as `/index.html` to `https://cdn.example.com/index.html`.

It's useful when your origin domain have no ICP license but you want to optimize mainland China routing.

# Usage

## GitHub Action

```yaml
- name: Inject Service Worker
  uses: Menci/service-worker-redirect-origin@beta-v1
  with:
    # The directory containing your built static website files.
    www-root: public

    # The target base-URL to redirect to.
    target-base-url: https://cdn.example.com/ # Remember to end with a "/"

    # If https://cdn.example.com/<requested url> responds with 404, it's will be fetched.
    # Omit to fallback to origin.
    http-404-page: 404.html
    
    # The script filename of service worker. Will be written to the `www-root` directory.
    # By default `sw.js`.
    service-worker-filename: sw.js
```

## Node.js


```bash
$ yarn inject <wwwRoot> <targetBaseUrl> [404Page] [serviceWorkerFilename]
```

See the explanation for each arguments above in GitHub Action usage.

# Limitations

It will replace your existing Service Worker in your site (if any).
