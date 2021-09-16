from otree.api import *


doc = """
Video chat between 2 players
"""


class Constants(BaseConstants):
    name_in_url = 'webcam'
    players_per_group = 2
    num_rounds = 1


class Subsession(BaseSubsession):
    pass


class Group(BaseGroup):
    pass


class Player(BasePlayer):
    pass


# PAGES
class Main(Page):
    @staticmethod
    def live_method(player, data):
        if 'video_chat' in data:
            return {3 - player.id_in_group: data}


page_sequence = [Main]
