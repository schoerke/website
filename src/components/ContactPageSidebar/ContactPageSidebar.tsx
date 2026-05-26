import React from 'react'
import SchoerkeLink from '@/components/ui/SchoerkeLink'

const ContactPageSidebar: React.FC = () => {
  return (
    <aside className="flex flex-col gap-6 items-start text-left lg:items-end lg:text-right">
      {/* TODO: pull from site settings global once CMS field exists */}
      <h3 className="font-playfair mb-0 text-2xl font-bold">
        Künstlersekretariat<br className="hidden lg:inline" /> Astrid Schoerke GmbH
      </h3>
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
    </aside>
  )
}

export default ContactPageSidebar
