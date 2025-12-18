export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex h-16 items-center justify-between px-4 w-full max-w-full">
        <p className="text-sm text-muted-foreground">
          © 2024 图片管理系统. All rights reserved.
        </p>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">
            关于
          </a>
          <a href="#" className="hover:text-primary transition-colors">
            隐私政策
          </a>
          <a href="#" className="hover:text-primary transition-colors">
            联系我们
          </a>
        </div>
      </div>
    </footer>
  )
}
