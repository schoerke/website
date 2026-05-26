import SchoerkeLink from '@/components/ui/SchoerkeLink'

const HomePageSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-6">
      <div>
        <h2 className="font-playfair mb-3 text-xl font-bold">Künstlersekretariat Astrid Schoerke GmbH</h2>
        <address className="not-italic text-gray-600 text-sm leading-relaxed space-y-1">
          <p>Emanuel-Geibel-Str. 10</p>
          <p>D-65185 Wiesbaden</p>
          <p>
            <SchoerkeLink href="mailto:info@ks-schoerke.de" variant="animated" className="text-sm">
              info@ks-schoerke.de
            </SchoerkeLink>
          </p>
          <p>
            <SchoerkeLink href="tel:+4906115058950" variant="animated" className="text-sm">
              +49 (0)611-50 58 90 50
            </SchoerkeLink>
          </p>
        </address>
      </div>
    </aside>
  )
}

export default HomePageSidebar
